import {Body,CanActivate,Controller,ExecutionContext,ForbiddenException,Get,Injectable,Module,NotFoundException,Post,Req,UnauthorizedException,UseGuards} from '@nestjs/common';
import {Request} from 'express';
import {IsEmail,IsOptional,IsString,Length,Matches} from 'class-validator';
import * as argon2 from 'argon2';
import {createHash,randomBytes} from 'node:crypto';
import {Database,audit} from '../database/database';
import {ADMIN_PERMISSIONS,AdminRole,permitted} from './permissions';
import {newTotpSecret,openSecret,sealSecret,verifyTotp} from './mfa';
declare module 'express-session' {interface SessionData {
 adminId?:string;adminVersion?:number;adminAccountVersion?:number;adminMfaAt?:number;adminActivityAt?:number;adminAuthenticatedAt?:number;
 adminChallenge?:{userId:string;version:number;accountVersion:number;expires:number;enrollment?:string;invitationHash?:string};
}}
export function adminConfigured(){return !!process.env.ADMIN_ORIGIN;}
export function hashInvitation(value:string){return createHash('sha256').update(value).digest('hex');}
export async function regenerate(req:Request){await new Promise<void>((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.csrf=randomBytes(32).toString('hex');}
export async function saveSession(req:Request){await new Promise<void>((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));}
@Injectable()
export class AdminGuard implements CanActivate {
 constructor(private readonly db:Database){}
 async canActivate(ctx:ExecutionContext){const req:Request=ctx.switchToHttp().getRequest();if(!adminConfigured())throw new NotFoundException();
 const s=req.session;if(!s.adminId||!s.adminMfaAt||Date.now()-(s.adminActivityAt??0)>15*60000||Date.now()-(s.adminAuthenticatedAt??0)>8*3600000)throw new UnauthorizedException();
 const [a]=await this.db.query('SELECT p.role,p.version,a.session_version FROM platform_admin p JOIN account a ON a.id=p.user_id WHERE p.user_id=$1 AND p.active AND a.active AND p.totp_secret IS NOT NULL',[s.adminId]);
 if(!a||a.version!==s.adminVersion||a.session_version!==s.adminAccountVersion){await new Promise<void>(resolve=>s.destroy(()=>resolve()));throw new UnauthorizedException();}
 s.adminActivityAt=Date.now();(req as any).adminRole=a.role;return true;}
}
export function authorizeAdmin(req:Request,permission:string,write=false){const role=(req as any).adminRole as AdminRole;if(!permitted(role,permission))throw new ForbiddenException();if(write&&Date.now()-(req.session.adminMfaAt??0)>5*60000)throw new ForbiddenException({code:'ADMIN_REAUTH_REQUIRED',message:'Confirmez votre code de double authentification.'});return req.session.adminId!;}
class LoginDto {@IsEmail() @Length(3,254) email!:string;@IsString() @Length(12,128) password!:string;@IsOptional() @IsString() @Length(32,128) invitation?:string;}
class MfaDto {@Matches(/^\d{6}$/) code!:string;}
@Controller('admin')
export class AdminAuthController {
 constructor(private readonly db:Database){}
 @Get('csrf') csrf(@Req() req:Request){if(!adminConfigured())throw new NotFoundException();req.session.csrf??=randomBytes(32).toString('hex');return {csrfToken:req.session.csrf};}
 @Post('login') async login(@Req() req:Request,@Body() b:LoginDto){if(!adminConfigured())throw new NotFoundException();
 const [a]=await this.db.query('SELECT a.id,a.password_hash,a.active AS account_active,a.session_version,p.* FROM account a JOIN platform_admin p ON p.user_id=a.id WHERE lower(a.email)=lower($1)',[b.email]);
 if(!a||!a.active||!a.account_active||new Date(a.locked_until??0).getTime()>Date.now())throw new UnauthorizedException('Connexion indisponible. Vérifiez vos identifiants.');
 const valid=await argon2.verify(a.password_hash,b.password).catch(()=>false);
 if(!valid){await this.failed(a.id);throw new UnauthorizedException('Connexion indisponible. Vérifiez vos identifiants.');}
 if(!a.totp_secret&&(!b.invitation||hashInvitation(b.invitation)!==a.invitation_hash||new Date(a.invitation_expires_at).getTime()<Date.now()))throw new UnauthorizedException('Invitation valide nécessaire.');
 await regenerate(req);const enrollment=a.totp_secret?undefined:newTotpSecret();req.session.adminChallenge={userId:a.id,version:a.version,accountVersion:a.session_version,expires:Date.now()+5*60000,...(enrollment?{enrollment:sealSecret(enrollment),invitationHash:a.invitation_hash}:{})};await saveSession(req);
 return {status:enrollment?'MFA_ENROLLMENT':'MFA_REQUIRED',csrfToken:req.session.csrf,...(enrollment?{otpauthUri:`otpauth://totp/${encodeURIComponent('InfiMatch administration:'+b.email)}?secret=${enrollment}&issuer=InfiMatch&algorithm=SHA1&digits=6&period=30`}:{})};}
 @Post('activate') async activate(@Req() req:Request,@Body() b:LoginDto){
  if(!adminConfigured())throw new NotFoundException();
  if(!b.invitation)throw new UnauthorizedException('Invitation valide necessaire.');
  await this.db.transaction(async em=>{
   const [a]=await em.query('SELECT a.id,a.password_hash,a.active AS account_active,a.platform_only,p.active,p.totp_secret,p.invitation_hash,p.invitation_expires_at FROM account a JOIN platform_admin p ON p.user_id=a.id WHERE lower(a.email)=lower($1) FOR UPDATE OF a,p',[b.email]);
   if(!a||!a.account_active||!a.active||!a.platform_only||a.totp_secret||a.password_hash!=='ADMIN_ACTIVATION_PENDING'||a.invitation_hash!==hashInvitation(b.invitation!)||new Date(a.invitation_expires_at).getTime()<Date.now())throw new UnauthorizedException('Activation indisponible. Verifiez votre invitation.');
   const hash=await argon2.hash(b.password,{type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:1});
   await em.query("UPDATE account SET password_hash=$2,session_version=session_version+1,terms_version='ADMIN_ACTIVATED',terms_at=now() WHERE id=$1",[a.id,hash]);
   await audit(em,a.id,'ADMIN_ACCOUNT_ACTIVATED',a.id);
  });
  return this.login(req,b);
 }
 private async failed(id:string){await this.db.query("UPDATE platform_admin SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts>=4 THEN now()+interval '15 minutes' ELSE locked_until END WHERE user_id=$1",[id]);await audit(this.db,id,'ADMIN_AUTH_FAILED',id);}
 @Post('mfa') async mfa(@Req() req:Request,@Body() b:MfaDto){const c=req.session.adminChallenge;delete req.session.adminChallenge;await saveSession(req);if(!c||c.expires<Date.now())throw new UnauthorizedException();
 const result=await this.db.transaction(async em=>{const [a]=await em.query('SELECT p.*,a.active AS account_active,a.session_version FROM platform_admin p JOIN account a ON a.id=p.user_id WHERE p.user_id=$1 FOR UPDATE OF p',[c.userId]);
 if(!a||!a.active||!a.account_active||a.version!==c.version||a.session_version!==c.accountVersion||new Date(a.locked_until??0).getTime()>Date.now())return null;
 if(c.enrollment&&(a.totp_secret||a.invitation_hash!==c.invitationHash||new Date(a.invitation_expires_at).getTime()<Date.now()))return null;
 const encrypted=a.totp_secret??c.enrollment;if(!encrypted)return null;const counter=verifyTotp(openSecret(encrypted),b.code,Number(a.last_counter));if(counter===null)return null;
 await em.query('UPDATE platform_admin SET totp_secret=$2,last_counter=$3,invitation_hash=NULL,invitation_expires_at=NULL,failed_attempts=0,locked_until=NULL WHERE user_id=$1',[c.userId,encrypted,counter]);await audit(em,c.userId,c.enrollment?'ADMIN_MFA_ENROLLED':'ADMIN_LOGIN',c.userId);return a;});
 if(!result){await this.failed(c.userId);throw new UnauthorizedException('Code invalide ou expiré. Reprenez la connexion.');}
 await regenerate(req);req.session.adminId=c.userId;req.session.adminVersion=result.version;req.session.adminAccountVersion=result.session_version;req.session.adminMfaAt=Date.now();req.session.adminActivityAt=Date.now();req.session.adminAuthenticatedAt=Date.now();await saveSession(req);return {role:result.role,csrfToken:req.session.csrf};}
 @Get('me') @UseGuards(AdminGuard) async me(@Req() req:Request){const [a]=await this.db.query('SELECT id,email FROM account WHERE id=$1',[req.session.adminId]);const role=(req as any).adminRole as AdminRole;return {...a,role,permissions:ADMIN_PERMISSIONS[role],mfaAt:req.session.adminMfaAt};}
 @Post('reauth') @UseGuards(AdminGuard) async reauth(@Req() req:Request,@Body() b:MfaDto){const ok=await this.db.transaction(async em=>{const [a]=await em.query('SELECT * FROM platform_admin WHERE user_id=$1 FOR UPDATE',[req.session.adminId]);if(new Date(a.locked_until??0).getTime()>Date.now())return false;const counter=verifyTotp(openSecret(a.totp_secret),b.code,Number(a.last_counter));if(counter===null)return false;await em.query('UPDATE platform_admin SET last_counter=$2,failed_attempts=0,locked_until=NULL WHERE user_id=$1',[a.user_id,counter]);await audit(em,a.user_id,'ADMIN_REAUTHENTICATED',a.user_id);return true;});if(!ok){await this.failed(req.session.adminId!);throw new UnauthorizedException('Code invalide ou déjà utilisé.');}req.session.adminMfaAt=Date.now();return {ok:true};}
 @Post('logout') async logout(@Req() req:Request){if(req.session.adminId)await audit(this.db,req.session.adminId,'ADMIN_LOGOUT',req.session.adminId);await new Promise<void>(resolve=>req.session.destroy(()=>resolve()));return {ok:true};}
}
