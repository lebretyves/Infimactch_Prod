import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Injectable, Module, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from "@nestjs/common";
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsOptional, IsString, Matches } from "class-validator";
import { Request } from "express";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { Database } from "../database/database";
import { member, SessionGuard, user } from "../common/access";
import { notificationCatalog, organizationKinds } from "./catalog";
import { notify } from "./events";
import { channelPermissions, discordApi, discordConfigured, DiscordFailure, guildPermissions, sendDiscord } from "./discord-client";

const hash=(value:string)=>createHash("sha256").update(value).digest("hex");
class ChallengeDto { @Matches(/^\d{17,20}$/) discordUserId!:string; }
class VerifyDto { @Matches(/^\d{6}$/) code!:string; }
class DestinationDto {
  @IsBoolean() enabled!:boolean;
  @IsArray() @ArrayMaxSize(30) @ArrayUnique() @IsIn(Object.keys(notificationCatalog),{each:true}) events!:string[];
  @IsOptional() @Matches(/^\d{17,20}$/) channelId?:string;
}
class PreferenceDto { @IsBoolean() discord!:boolean; }
@Injectable()
export class NotificationsService {
  constructor(private readonly db:Database) {}
  async challenge(actor:string, discordUserId:string) {
    const code=String(randomInt(100000,1000000));
    const challenge=await this.db.transaction(async em=>{
      await em.query("SELECT id FROM account WHERE id=$1 AND active FOR UPDATE",[actor]);
      const [rate]=await em.query("SELECT count(*)::int AS n FROM discord_challenge WHERE (account_id=$1 OR discord_user_id=$2) AND created_at>now()-interval '1 hour'",[actor,discordUserId]);
      if(rate.n>=3) throw new BadRequestException("Trois codes maximum par heure. Réessayez plus tard.");
      await em.query("UPDATE discord_challenge SET expires_at=now() WHERE account_id=$1 AND verified_at IS NULL",[actor]);
      const [row]=await em.query("INSERT INTO discord_challenge(account_id,discord_user_id,code_hash,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes') RETURNING id",[actor,discordUserId,hash(actor+":"+code)]);
      return row;
    });
    try {
      await sendDiscord("user",discordUserId,"Votre code de connexion InfiMatch : **"+code+"**. Valable 10 minutes. Saisissez-le uniquement dans votre espace InfiMatch. Si vous n’avez rien demandé, ignorez ce message.",challenge.id.replace(/-/g,"").slice(0,25));
    } catch {
      await this.db.query("UPDATE discord_challenge SET expires_at=now() WHERE id=$1",[challenge.id]);
      throw new BadRequestException("Impossible d’envoyer le code. Rejoignez le serveur du bot et autorisez ses messages privés, puis vérifiez votre identifiant Discord.");
    }
    return {ok:true};
  }
  async verify(actor:string,code:string) {
    const result=await this.db.transaction(async em=>{
      await em.query("SELECT id FROM account WHERE id=$1 FOR UPDATE",[actor]);
      const [row]=await em.query("SELECT * FROM discord_challenge WHERE account_id=$1 AND verified_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE",[actor]);
      if(!row || row.attempts>=5) return false;
      await em.query("UPDATE discord_challenge SET attempts=attempts+1 WHERE id=$1",[row.id]);
      if(row.code_hash!==hash(actor+":"+code)) return false;
      const [other]=await em.query("SELECT account_id FROM discord_link WHERE discord_user_id=$1 AND account_id<>$2",[row.discord_user_id,actor]);
      if(other) return false;
      // Disconnecting first revokes old destinations and cancels their queued deliveries.
      await em.query("DELETE FROM discord_link WHERE account_id=$1",[actor]);
      await em.query("INSERT INTO discord_link(account_id,discord_user_id,username) VALUES($1,$2,$2)",[actor,row.discord_user_id]);
      await em.query("UPDATE discord_challenge SET verified_at=now() WHERE id=$1",[row.id]);
      await em.query("INSERT INTO discord_destination(user_id,connected_by,target_type,target_id) VALUES($1,$1,'user',$2)",[actor,row.discord_user_id]);
      await notify(em,"DISCORD_CONNECTED",[actor]);
      return true;
    });
    if(!result) throw new BadRequestException("Code invalide, expiré ou compte Discord déjà associé.");
    return {ok:true};
  }
  async validateChannel(actor:string,channelId:string) {
    const [link]=await this.db.query("SELECT discord_user_id FROM discord_link WHERE account_id=$1",[actor]);
    if(!link) throw new BadRequestException("Associez d’abord votre compte Discord.");
    const channel=await discordApi("/channels/"+channelId);
    if(channel.type!==0 || !channel.guild_id) throw new BadRequestException("Choisissez un salon textuel privé du serveur.");
    const [guild,roles,human,bot]=await Promise.all([
      discordApi("/guilds/"+channel.guild_id),discordApi("/guilds/"+channel.guild_id+"/roles"),
      discordApi("/guilds/"+channel.guild_id+"/members/"+link.discord_user_id),discordApi("/users/@me")]);
    if((guildPermissions(guild,human,roles)&(8n|32n))===0n) throw new BadRequestException("Vous devez pouvoir gérer ce serveur Discord.");
    const botMember=await discordApi("/guilds/"+channel.guild_id+"/members/"+bot.id);
    const required=1024n|2048n;
    if((channelPermissions(guild,botMember,roles,channel)&required)!==required) throw new BadRequestException("Le bot doit pouvoir voir le salon et envoyer des messages.");
    const everyone={user:{id:"0"},roles:[]};
    if((channelPermissions(guild,everyone,roles,channel)&1024n)!==0n) throw new BadRequestException("Ce salon est public. Retirez Voir les salons au rôle @everyone.");
    return channel;
  }
  async destination(actor:string,org:string|null,b:DestinationDto) {
    if(org) await member(this.db,actor,org);
    if(org && b.events.some(k=>!organizationKinds.includes(k))) throw new BadRequestException("Les notifications personnelles ne peuvent pas être envoyées à une organisation.");
    if(!org && b.events.some(k=>["NEED_CREATED","NEED_UPDATED","MISSION_PUBLISHED","REMINDER"].includes(k))) throw new BadRequestException("Choisissez les événements personnels.");
    const channel=org && b.enabled ? await this.validateChannel(actor,b.channelId || "") : null;
    return this.db.transaction(async em=>{
      if(org) await member(em,actor,org);
      const [link]=await em.query("SELECT * FROM discord_link WHERE account_id=$1 FOR UPDATE",[actor]);
      if(!link) throw new BadRequestException("Associez d’abord votre compte Discord.");
      if(org && !b.enabled) {
        await em.query("UPDATE discord_destination SET enabled=false,version=version+1,updated_at=now() WHERE organization_id=$1",[org]);
      } else if(org) {
        const [used]=await em.query("SELECT id FROM discord_destination WHERE target_id=$1 AND organization_id<>$2",[channel.id,org]);
        if(used) throw new ConflictException("Ce salon est déjà réservé à une autre organisation.");
        await em.query("INSERT INTO discord_destination(organization_id,connected_by,target_type,target_id,guild_id,channel_name,enabled,events) VALUES($1,$2,'channel',$3,$4,$5,$6,$7) ON CONFLICT(organization_id) DO UPDATE SET connected_by=$2,target_id=$3,guild_id=$4,channel_name=$5,enabled=$6,events=$7,version=discord_destination.version+1,updated_at=now()",[org,actor,channel.id,channel.guild_id,channel.name,b.enabled,b.events]);
      } else {
        await em.query("UPDATE discord_destination SET enabled=$2,events=$3,version=version+1,updated_at=now() WHERE user_id=$1",[actor,b.enabled,b.events]);
      }
      return {ok:true};
    });
  }
  async dispatch(limit=20) {
    if(!discordConfigured()) return {sent:0,configured:false};
    // A crash after a send is ambiguous: never blindly replay it.
    await this.db.query("UPDATE notification_delivery SET status='UNCERTAIN',last_error='SEND_RESULT_UNKNOWN' WHERE status='SENDING' AND lease_until<now()");
    let sent=0;
    for(let i=0;i<limit;i++) {
      const item=await this.db.transaction(async em=>{
        const [row]=await em.query("SELECT d.*,n.message,n.href,n.context,n.user_id,n.organization_id,x.target_type,x.target_id,x.enabled,x.events,x.version,x.connected_by FROM notification_delivery d JOIN notification n ON n.id=d.notification_id JOIN discord_destination x ON x.id=d.destination_id WHERE d.status='PENDING' AND d.available_at<=now() ORDER BY d.created_at LIMIT 1 FOR UPDATE OF d SKIP LOCKED");
        if(!row) return null;
        const [active]=await em.query("SELECT 1 FROM account WHERE id=$1 AND active",[row.user_id]);
        const [owner]=await em.query("SELECT 1 FROM account a WHERE a.id=$1 AND a.active AND ($2::uuid IS NULL OR EXISTS(SELECT 1 FROM membership m WHERE m.user_id=a.id AND m.organization_id=$2 AND m.active))",[row.connected_by,row.organization_id]);
        const [muted]=await em.query("SELECT 1 FROM notification_preference WHERE account_id=$1 AND kind=$2 AND NOT discord",[row.user_id,row.kind]);
        let obsolete=false;
        if(row.context.missionId) {
          const [m]=await em.query("SELECT status,version,start_at FROM mission WHERE id=$1",[row.context.missionId]);
          obsolete=!m || m.version!==row.context.version;
          if(m && ["MATCH","REMINDER","MISSION_CHANGED","APPLICATION_SUBMITTED","APPLICATION_SELECTED","MISSION_PUBLISHED"].includes(row.kind)) obsolete ||= m.status!=="OPEN" || new Date(m.start_at).getTime()<=Date.now();
          if(m && row.kind==='CONFIRMATION') obsolete ||= !['FILLED','COMPLETED'].includes(m.status);
          if(m && row.kind==='CANCELLATION') obsolete ||= m.status!=='CANCELLED';
          if(row.kind==='MATCH') { const [p]=await em.query("SELECT 1 FROM profile WHERE user_id=$1 AND notifications_enabled",[row.user_id]); obsolete ||= !p; }
        }
        if(!active || !owner || !row.enabled || row.version!==row.destination_version || !row.events.includes(row.kind) || (!row.organization_id && muted) || obsolete) {
          await em.query("UPDATE notification_delivery SET status='CANCELLED',last_error='DESTINATION_OR_EVENT_CHANGED' WHERE id=$1",[row.id]);return {skip:true};
        }
        const token=randomUUID();
        await em.query("UPDATE notification_delivery SET status='SENDING',attempts=attempts+1,lease_token=$2,lease_until=now()+interval '90 seconds' WHERE id=$1",[row.id,token]);
        return {...row,token};
      });
      if(!item) break;
      if(item.skip) continue;
      try {
        const origin=process.env.NOTIFICATION_APP_ORIGIN || process.env.APP_ORIGIN!;
        const reference=item.context.missionId ? "\nRéférence mission : "+item.context.missionId : "";
        const link=new URL(item.href,origin);
        link.searchParams.set("notification",item.notification_id);
        const content=item.message+reference+"\n"+link.href;
        const result=await sendDiscord(item.target_type,item.target_id,content,item.id.replace(/-/g,"").slice(0,25));
        if(!/^\d{17,20}$/.test(result?.id || "")) throw new Error("INVALID_SEND_RECEIPT");
        await this.db.query("UPDATE notification_delivery SET status='SENT',message_id=$3,sent_at=now(),lease_until=NULL WHERE id=$1 AND lease_token=$2",[item.id,item.token,result.id]);sent++;
      } catch(error) {
        const retry=error instanceof DiscordFailure && error.status===429 && item.attempts<4;
        const definite=error instanceof DiscordFailure && error.status>=400 && error.status<500;
        await this.db.query("UPDATE notification_delivery SET status=$3,last_error=$4,available_at=now()+interval '60 seconds',lease_until=NULL WHERE id=$1 AND lease_token=$2",[item.id,item.token,retry?'PENDING':definite?'FAILED':'UNCERTAIN',error instanceof DiscordFailure?error.message:'SEND_RESULT_UNKNOWN']);
      }
    }
    return {sent,configured:true};
  }
}
@Controller("me/notifications-settings")
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(private readonly db:Database,private readonly service:NotificationsService) {}
  @Get() async settings(@Req() r:Request) {
    const actor=user(r);
    const [link]=await this.db.query("SELECT discord_user_id,connected_at FROM discord_link WHERE account_id=$1",[actor]);
    const destinations=await this.db.query("SELECT d.id,d.user_id,d.organization_id,d.enabled,d.events,d.channel_name,d.target_id FROM discord_destination d WHERE d.user_id=$1 OR EXISTS(SELECT 1 FROM membership m WHERE m.user_id=$1 AND m.active AND m.organization_id=d.organization_id)",[actor]);
    const preferences=await this.db.query("SELECT kind,discord FROM notification_preference WHERE account_id=$1",[actor]);
    return {configured:discordConfigured(),link:link??null,destinations,preferences,catalog:notificationCatalog,organizationKinds};
  }
  @Post("discord/challenge") challenge(@Req() r:Request,@Body() b:ChallengeDto) {return this.service.challenge(user(r),b.discordUserId);}
  @Post("discord/verify") verify(@Req() r:Request,@Body() b:VerifyDto) {return this.service.verify(user(r),b.code);}
  @Delete("discord") async disconnect(@Req() r:Request) {await this.db.query("DELETE FROM discord_link WHERE account_id=$1",[user(r)]);await this.db.query("DELETE FROM discord_challenge WHERE account_id=$1",[user(r)]);return {ok:true};}
  @Put("discord") destination(@Req() r:Request,@Body() b:DestinationDto) {return this.service.destination(user(r),null,b);}
  @Put("organizations/:id/discord") orgDestination(@Req() r:Request,@Param("id",ParseUUIDPipe) id:string,@Body() b:DestinationDto) {return this.service.destination(user(r),id,b);}
  @Put("preferences/:kind") async preference(@Req() r:Request,@Param("kind") kind:string,@Body() b:PreferenceDto) {
    if(!(kind in notificationCatalog)) throw new BadRequestException();
    await this.db.query("INSERT INTO notification_preference(account_id,kind,discord) VALUES($1,$2,$3) ON CONFLICT(account_id,kind) DO UPDATE SET discord=$3",[user(r),kind,b.discord]);return {ok:true};
  }
  @Get("deliveries") deliveries(@Req() r:Request) {return this.db.query("SELECT d.id,d.kind,d.status,d.last_error,d.created_at,d.sent_at FROM notification_delivery d JOIN notification n ON n.id=d.notification_id WHERE n.user_id=$1 ORDER BY d.created_at DESC LIMIT 50",[user(r)]);}
}
@Module({controllers:[NotificationsController],providers:[NotificationsService],exports:[NotificationsService]})
export class NotificationsModule {}
