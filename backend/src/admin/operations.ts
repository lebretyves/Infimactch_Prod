import {ApiProperty} from '@nestjs/swagger';
import {notificationCatalog} from '../notifications/catalog';
import {BadRequestException,Body,ConflictException,Controller,Get,NotFoundException,Param,ParseUUIDPipe,Post,Query,Req,UseGuards} from '@nestjs/common';
import {IsBoolean,IsEmail,IsIn,IsString,IsUUID,Length} from 'class-validator';
import {Request} from 'express';
import {Database,audit} from '../database/database';
import {PageDto} from '../common/page.dto';
import {MatchingService} from '../matching/matching.module';
import {MATCH_RULES} from '../domain/rules';
import {PROVIDERS,providerName,RefreshService} from '../public-data/refresh.service';
import {AdminGuard,authorizeAdmin} from './admin-auth';

class Reason {@ApiProperty({type:String,minLength:8,maxLength:500}) @IsString() @Length(8,500) reason!:string;}
class Membership extends Reason {@IsEmail() @Length(3,254) email!:string;@IsBoolean() active!:boolean;}
class Link extends Reason {@IsUUID() otherOrganizationId!:string;@IsBoolean() active!:boolean;}
class Review extends Reason {@IsIn(['TO_REVIEW','REVIEWED','NEEDS_INFORMATION']) state!:string;}
class SourceState extends Reason {@IsBoolean() enabled!:boolean;}
class SourceVisibility extends Reason {@ApiProperty({type:Boolean}) @IsBoolean() visible!:boolean;}
const SERVICES=['API','POSTGRES','MONGODB','N8N','DISCORD','IMPORTS','DOCUMENTS','VAULT'];
class Incident extends Reason {@IsIn(SERVICES) service!:string;@IsString() @Length(8,500) impact!:string;@IsString() @Length(2,100) ownerLabel!:string;}
class IncidentState extends Reason {@IsIn(['OPEN','INVESTIGATING','RESOLVED']) state!:string;}

@Controller('admin') @UseGuards(AdminGuard)
export class AdminOperationsController {
  constructor(private readonly db:Database,private readonly matching:MatchingService,private readonly refresh:RefreshService){}
  private async page(sql:string,args:unknown[],p:PageDto) {
    const [count]=await this.db.query(`SELECT count(*)::int AS total FROM (${sql}) bounded`,args);
    const items=await this.db.query(sql+` LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,p.limit,p.offset]);
    return {items,total:count.total,limit:p.limit,offset:p.offset};
  }

  @Get('accounts/:id/notifications') async accountNotifications(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string) {
    const actor=authorizeAdmin(r,'accounts');
    if(!(await this.db.query('SELECT id FROM account WHERE id=$1',[id])).length)throw new NotFoundException();
    const [links,challenges,destinations,preferences,internalRows,countRows,rows,organizations]=await Promise.all([
      this.db.query('SELECT discord_user_id,connected_at FROM discord_link WHERE account_id=$1',[id]),
      this.db.query('SELECT expires_at FROM discord_challenge WHERE account_id=$1 AND verified_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 1',[id]),
      this.db.query('SELECT enabled,events,updated_at FROM discord_destination WHERE user_id=$1',[id]),
      this.db.query('SELECT kind FROM notification_preference WHERE account_id=$1 AND NOT discord',[id]),
      this.db.query('SELECT count(*)::int AS total,count(*) FILTER(WHERE read_at IS NULL)::int AS unread FROM notification WHERE user_id=$1',[id]),
      this.db.query('SELECT d.status,count(*)::int AS total FROM notification_delivery d JOIN discord_destination x ON x.id=d.destination_id WHERE x.user_id=$1 GROUP BY d.status',[id]),
      this.db.query(`SELECT d.id,d.kind,d.status,d.attempts,d.created_at AS "createdAt",d.sent_at AS "sentAt",CASE WHEN d.last_error ~ '^DISCORD_[0-9]{3}$' THEN replace(d.last_error,'DISCORD_','DISCORD_HTTP_') WHEN d.status='UNCERTAIN' THEN 'DELIVERY_UNCERTAIN' WHEN d.last_error IS NOT NULL THEN 'DELIVERY_FAILED' ELSE NULL END AS "errorCode" FROM notification_delivery d JOIN discord_destination x ON x.id=d.destination_id WHERE x.user_id=$1 ORDER BY d.created_at DESC,d.id DESC LIMIT 10`,[id]),
      this.db.query(`SELECT o.id,o.name,o.kind,d.id IS NOT NULL AS configured,COALESCE(d.enabled,false) AS enabled,d.channel_name AS "channelName",COALESCE(d.events,'{}'::text[]) AS events,d.updated_at AS "updatedAt" FROM membership m JOIN organization o ON o.id=m.organization_id LEFT JOIN discord_destination d ON d.organization_id=o.id WHERE m.user_id=$1 AND m.active ORDER BY o.name,o.id LIMIT 100`,[id]),
    ]);
    const link=links[0],challenge=challenges[0],destination=destinations[0];
    const selectedEvents:string[]=destination?.events??[],mutedEvents:string[]=preferences.map(p=>p.kind);
    const effectiveEvents=link&&destination?.enabled?selectedEvents.filter(kind=>!mutedEvents.includes(kind)):[];
    const state=link?'ASSOCIATED':challenge?(new Date(challenge.expires_at).getTime()>Date.now()?'PENDING':'EXPIRED'):'NOT_ASSOCIATED';
    await audit(this.db,actor,'ADMIN_NOTIFICATION_SETTINGS_VIEWED',id);
    return {observedAt:new Date().toISOString(),connection:{state,discordUserId:link?.discord_user_id??null,connectedAt:link?.connected_at??null,challengeExpiresAt:!link?(challenge?.expires_at??null):null},personal:{state:!link?'NOT_ASSOCIATED':!destination?.enabled?'DISABLED':effectiveEvents.length?'ENABLED':'NO_EVENTS',selectedEvents,mutedEvents,effectiveEvents,updatedAt:destination?.updated_at??null},internal:internalRows[0],deliveries:{counts:Object.fromEntries(countRows.map(row=>[row.status,row.total])),latest:rows[0]??null,recent:rows},organizations,catalog:notificationCatalog};
  }

  @Get('organizations/:id') async organization(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string) {
    const actor=authorizeAdmin(r,'organizations');
    const [organization]=await this.db.query('SELECT id,name,kind,address,finess,siret FROM organization WHERE id=$1',[id]);
    if(!organization)throw new NotFoundException();
    await audit(this.db,actor,'ADMIN_ORGANIZATION_VIEWED',id);
    return {organization,members:await this.db.query('SELECT m.user_id,a.email,m.active,a.active account_active FROM membership m JOIN account a ON a.id=m.user_id WHERE m.organization_id=$1 ORDER BY a.email LIMIT 100',[id]),links:await this.db.query('SELECT l.agency_id,l.establishment_id,a.name agency_name,e.name establishment_name FROM agency_link l JOIN organization a ON a.id=l.agency_id JOIN organization e ON e.id=l.establishment_id WHERE l.agency_id=$1 OR l.establishment_id=$1 ORDER BY a.name,e.name LIMIT 100',[id])};
  }

  @Post('organizations/:id/members') async membership(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:Membership) {
    const actor=authorizeAdmin(r,'organizations:write',true);
    return this.db.transaction(async em=>{
      // Serialize additions/removals for this organization, preserving a usable manager.
      if(!(await em.query('SELECT id FROM organization WHERE id=$1 FOR UPDATE',[id])).length)throw new NotFoundException();
      const [account]=await em.query('SELECT id,family,active,platform_only FROM account WHERE lower(email)=lower($1) FOR SHARE',[b.email]);
      if(!account||account.platform_only||account.family!=='ENTERPRISE'||(b.active&&!account.active))throw new BadRequestException('Compte entreprise existant et actif nécessaire.');
      const [current]=await em.query('SELECT active FROM membership WHERE organization_id=$1 AND user_id=$2',[id,account.id]);
      if(!b.active&&current?.active) {
        const [others]=await em.query('SELECT count(*)::int count FROM membership m JOIN account a ON a.id=m.user_id WHERE m.organization_id=$1 AND m.user_id<>$2 AND m.active AND a.active',[id,account.id]);
        if(!others.count)throw new ConflictException('Conserver au moins un membre actif avant ce retrait.');
      }
      if(!current&&!b.active)throw new NotFoundException();
      await em.query('INSERT INTO membership(user_id,organization_id,active) VALUES($1,$2,$3) ON CONFLICT(user_id,organization_id) DO UPDATE SET active=EXCLUDED.active',[account.id,id,b.active]);
      await em.query('UPDATE account SET session_version=session_version+1 WHERE id=$1',[account.id]);
      await em.query("DELETE FROM session WHERE sess->>'userId'=$1",[account.id]);
      await audit(em,actor,'ADMIN_MEMBERSHIP_CHANGED',id,{userId:account.id,active:b.active,reason:b.reason});
      return {ok:true};
    });
  }

  @Post('organizations/:id/links') async link(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:Link) {
    const actor=authorizeAdmin(r,'organizations:write',true);
    return this.db.transaction(async em=>{
      const rows=await em.query('SELECT id,kind FROM organization WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[[id,b.otherOrganizationId]]);
      const agency=rows.find(o=>o.kind==='AGENCY'),establishment=rows.find(o=>o.kind==='ESTABLISHMENT');
      if(rows.length!==2||!agency||!establishment)throw new BadRequestException('Une agence et un établissement distincts sont nécessaires.');
      if(b.active)await em.query('INSERT INTO agency_link(agency_id,establishment_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[agency.id,establishment.id]);
      else {
        await em.query('SELECT agency_id FROM agency_link WHERE agency_id=$1 AND establishment_id=$2 FOR UPDATE',[agency.id,establishment.id]);
        const active=await em.query("SELECT id FROM mission WHERE agency_id=$1 AND establishment_id=$2 AND status IN('DRAFT','OPEN','FILLED') LIMIT 1",[agency.id,establishment.id]);
        if(active.length)throw new ConflictException('Des missions restent en cours sur ce rattachement.');
        await em.query('DELETE FROM agency_link WHERE agency_id=$1 AND establishment_id=$2',[agency.id,establishment.id]);
      }
      await audit(em,actor,'ADMIN_AGENCY_LINK_CHANGED',id,{agencyId:agency.id,establishmentId:establishment.id,active:b.active,reason:b.reason});
      return {ok:true};
    });
  }

  @Get('missions/:id/matching') async matches(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Query() p:PageDto) {
    const actor=authorizeAdmin(r,'matching');
    const [mission]=await this.db.query('SELECT version,status FROM mission WHERE id=$1',[id]);
    if(!mission)throw new NotFoundException();
    await this.matching.ready();
    const query={missionId:id,expiresAt:{$gt:new Date()}};
    const [runs,total]=await Promise.all([this.matching.runs.find(query).sort({createdAt:-1,_id:-1}).skip(p.offset).limit(p.limit).lean(),this.matching.runs.countDocuments(query)]);
    const profiles=runs.length?await this.db.query('SELECT user_id,updated_at,rpps_version FROM profile WHERE user_id=ANY($1::uuid[])',[runs.map(x=>x.ownerId)]):[];
    await audit(this.db,actor,'ADMIN_MATCHING_VIEWED',id);
    return {items:runs.map(x=>({id:String(x._id),ownerId:x.ownerId,missionId:id,missionVersion:x.missionVersion,profileVersion:x.profileVersion,rulesVersion:x.rulesVersion,createdAt:(x as any).createdAt,expiresAt:x.expiresAt,result:x.result,stale:x.missionVersion!==mission.version||x.missionStatus!==mission.status||x.rulesVersion!==MATCH_RULES.version||!profiles.some(p=>p.user_id===x.ownerId&&new Date(p.updated_at).toISOString()+":"+p.rpps_version===x.profileVersion)})),total,limit:p.limit,offset:p.offset};
  }

  @Get('accounts/:id/verification') async verification(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string) {
    const actor=authorizeAdmin(r,'accounts');
    const [p]=await this.db.query('SELECT rpps_status,rpps_checked_at,rpps_reason,rpps_identity_review FROM profile WHERE user_id=$1',[id]);
    if(!p)throw new NotFoundException();
    const [identity]=await this.db.query('SELECT issuer,authenticated_at FROM professional_identity WHERE user_id=$1 ORDER BY authenticated_at DESC LIMIT 1',[id]);
    await audit(this.db,actor,'ADMIN_VERIFICATION_VIEWED',id);
    return {directory:{status:p.rpps_status,checkedAt:p.rpps_checked_at,reason:p.rpps_reason,identityReview:p.rpps_identity_review},professionalIdentity:identity?{issuer:identity.issuer,authenticatedAt:identity.authenticated_at}:null,reviews:await this.db.query('SELECT id,state,reason,created_at,actor_id FROM professional_review WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',[id])};
  }
  @Post('accounts/:id/verification') async review(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:Review) {
    const actor=authorizeAdmin(r,'verification:write',true);
    return this.db.transaction(async em=>{
      if(!(await em.query('SELECT user_id FROM profile WHERE user_id=$1 FOR SHARE',[id])).length)throw new NotFoundException();
      const [review]=await em.query('INSERT INTO professional_review(user_id,actor_id,state,reason) VALUES($1,$2,$3,$4) RETURNING id',[id,actor,b.state,b.reason]);
      await audit(em,actor,'ADMIN_PROFESSIONAL_REVIEW',id,{reviewId:review.id,state:b.state});
      return {ok:true}; // Deliberately never changes RPPS, qualifications or eligibility.
    });
  }

  @Get('operations') async operations(@Req() r:Request) {
    authorizeAdmin(r,'sources');
    const controls=await this.db.query('SELECT provider,enabled,visible,updated_at,collection_state FROM source_control ORDER BY provider');
    const runs=await this.db.query('SELECT DISTINCT ON(provider) provider,status,created_at,summary FROM import_run WHERE provider=ANY($1::text[]) ORDER BY provider,created_at DESC',[[...PROVIDERS]]);
    const counts=await this.db.query("SELECT source,count(*)::int total,count(*) FILTER(WHERE active)::int active,count(*) FILTER(WHERE active AND jsonb_typeof(provenance#>'{facts,location,coordinates}')='object')::int localized FROM external_offer GROUP BY source");
    const [credits]=await this.db.query("SELECT COALESCE(sum(charged),0)::int used FROM jobspipe_request_receipt WHERE budget_month=date_trunc('month',now() AT TIME ZONE 'UTC')::date");
    return {sources:controls.map(c=>{const run=runs.find(x=>x.provider===c.provider);const state=c.collection_state;const collection=state?{status:state.phase??state.terminal??(state.completedAt?'COMPLETE':'IN_PROGRESS'),observed:state.seen?.length??state.seenIds?.length??0,pages:state.pages??null,remainingQueries:state.queue?.length??null,startedAt:state.startedAt,completedAt:state.completedAt??null,retryAt:state.retryAt??null,reason:state.error??state.reason??null,creditsUsed:c.provider==='JOBSPIPE'?credits.used:null,creditLimit:c.provider==='JOBSPIPE'?1000:null}:null;return {provider:c.provider,enabled:c.enabled,visible:c.visible,updated_at:c.updated_at,collection,nextScheduleLabel:c.enabled?(c.provider==='FRANCE_TRAVAIL'?'Chaque jour à 7 h et 15 h (Europe/Paris)':'Chaque jour à 7 h (Europe/Paris)'):'Planification suspendue',counts:counts.find(x=>x.source===c.provider)??{total:0,active:0},lastRun:run?{status:run.status,created_at:run.created_at,accepted:run.summary?.accepted??null,rejected:Array.isArray(run.summary?.rejected)?run.summary.rejected.length:null,duplicates:Array.isArray(run.summary?.duplicates)?run.summary.duplicates.length:null,error:run.status==='FAILED'?'Acquisition interrompue ; vérifier les accès et quotas du fournisseur.':null}:null};}),incidents:await this.db.query("SELECT id,service,state,impact,owner_label,started_at,updated_at,resolved_at FROM operational_incident WHERE state<>'RESOLVED' ORDER BY updated_at DESC LIMIT 20"),observedAt:new Date().toISOString()};
  }
  @Post('operations/sources/:provider/state') async sourceState(@Req() r:Request,@Param('provider') name:string,@Body() b:SourceState) {
    const actor=authorizeAdmin(r,'sources:write',true),provider=providerName(name);
    return this.db.transaction(async em=>{await em.query('UPDATE source_control SET enabled=$2,updated_at=now() WHERE provider=$1',[provider,b.enabled]);await audit(em,actor,'ADMIN_SOURCE_SCHEDULE_CHANGED',null,{provider,enabled:b.enabled,reason:b.reason});return {ok:true};});
  }
  @Post('operations/sources/:provider/visibility') async sourceVisibility(@Req() r:Request,@Param('provider') name:string,@Body() b:SourceVisibility) {
    const actor=authorizeAdmin(r,'sources:write',true),provider=providerName(name);
    return this.db.transaction(async em=>{
      await em.query('UPDATE source_control SET visible=$2,updated_at=now() WHERE provider=$1',[provider,b.visible]);
      await audit(em,actor,'ADMIN_SOURCE_VISIBILITY_CHANGED',null,{provider,visible:b.visible,reason:b.reason});
      return {ok:true};
    });
  }
  @Post('operations/sources/:provider/refresh') async refreshSource(@Req() r:Request,@Param('provider') name:string,@Body() b:Reason) {
    const actor=authorizeAdmin(r,'sources:write',true),provider=providerName(name);
    await audit(this.db,actor,'ADMIN_SOURCE_REFRESH_REQUESTED',null,{provider,reason:b.reason});
    return this.refresh.run(provider,true);
  }
  @Get('incidents') incidents(@Req() r:Request,@Query() p:PageDto) {
    authorizeAdmin(r,'infrastructure');return this.page('SELECT id,service,state,impact,owner_label,started_at,updated_at,resolved_at FROM operational_incident ORDER BY updated_at DESC,id',[],p);
  }
  @Post('incidents') async incident(@Req() r:Request,@Body() b:Incident) {
    const actor=authorizeAdmin(r,'incidents:write',true);
    return this.db.transaction(async em=>{const [row]=await em.query('INSERT INTO operational_incident(service,impact,owner_label) VALUES($1,$2,$3) RETURNING id',[b.service,b.impact,b.ownerLabel]);await audit(em,actor,'ADMIN_INCIDENT_OPENED',row.id,{reason:b.reason});return row;});
  }
  @Post('incidents/:id') async incidentState(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:IncidentState) {
    const actor=authorizeAdmin(r,'incidents:write',true);
    return this.db.transaction(async em=>{const rows=await em.query("UPDATE operational_incident SET state=$2,updated_at=now(),resolved_at=CASE WHEN $2='RESOLVED' THEN COALESCE(resolved_at,now()) ELSE NULL END WHERE id=$1 RETURNING id",[id,b.state]);if(!rows.length)throw new NotFoundException();await audit(em,actor,'ADMIN_INCIDENT_UPDATED',id,{state:b.state,reason:b.reason});return {ok:true};});
  }

}
