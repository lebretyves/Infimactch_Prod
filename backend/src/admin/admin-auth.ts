import {Body,CanActivate,Controller,ExecutionContext,ForbiddenException,Get,Injectable,NotFoundException,Post,Req,UnauthorizedException,UseGuards} from '@nestjs/common';
import {Request} from 'express';
import {IsEmail,IsOptional,IsString,Length} from 'class-validator';
import * as argon2 from 'argon2';
import {createHash,randomBytes} from 'node:crypto';
import {newTotpSecret,verifyTotp,sealSecret,openSecret} from './mfa';
import {Database,audit} from '../database/database';
import {ADMIN_PERMISSIONS,AdminRole,permitted} from './permissions';

declare module 'express-session' {interface SessionData {
 adminMfaVerified?:boolean;adminId?:string;adminVersion?:number;adminAccountVersion?:number;adminVerifiedAt?:number;adminActivityAt?:number;adminAuthenticatedAt?:number;
 adminChallenge?:{userId:string;version:number;accountVersion:number;expires:number;enrollment?:string;invitationHash?:string;reset?:boolean};
}}
export function adminConfigured(){return !!process.env.ADMIN_ORIGIN;}
export function hashInvitation(value:string){return createHash('sha256').update(value).digest('hex');}
export async function regenerate(req:Request){await new Promise<void>((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.csrf=randomBytes(32).toString('hex');}
export async function saveSession(req:Request){await new Promise<void>((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));}
@Injectable()
export class AdminGuard implements CanActivate {
 constructor(private readonly db:Database){}
 async canActivate(ctx:ExecutionContext){const req:Request=ctx.switchToHttp().getRequest();if(!adminConfigured())throw new NotFoundException();
 const s=req.session;if(!s.adminMfaVerified||!s.adminId||!s.adminVerifiedAt||Date.now()-(s.adminActivityAt??0)>15*60000||Date.now()-(s.adminAuthenticatedAt??0)>8*3600000)throw new UnauthorizedException();
 const [a]=await this.db.query('SELECT p.role,p.version,p.totp_secret IS NOT NULL AS mfa_enrolled,a.session_version FROM platform_admin p JOIN account a ON a.id=p.user_id WHERE p.user_id=$1 AND p.active AND a.active',[s.adminId]);
 if(!a||!a.mfa_enrolled||a.version!==s.adminVersion||a.session_version!==s.adminAccountVersion){await new Promise<void>(resolve=>s.destroy(()=>resolve()));throw new UnauthorizedException();}
 s.adminActivityAt=Date.now();(req as any).adminRole=a.role;return true;}
}
export function authorizeAdmin(req:Request,permission:string,write=false){const role=(req as any).adminRole as AdminRole;if(!permitted(role,permission))throw new ForbiddenException();if(write&&Date.now()-(req.session.adminVerifiedAt??0)>5*60000)throw new ForbiddenException({code:'ADMIN_REAUTH_REQUIRED',message:'Confirmez votre mot de passe et votre code de sécurité.'});return req.session.adminId!;}
class LoginDto {@IsEmail() @Length(3,254) email!:string;@IsString() @Length(12,128) password!:string;@IsOptional() @IsString() @Length(32,128) invitation?:string;}
class MfaDto {@IsString() @Length(6,64) code!:string;}
class PasswordDto extends MfaDto {@IsString() @Length(12,128) password!:string;}
@Controller('admin')
export class AdminAuthController {
 constructor(private readonly db:Database){}
 @Get('csrf') csrf(@Req() req:Request){if(!adminConfigured())throw new NotFoundException();req.session.csrf??=randomBytes(32).toString('hex');return {csrfToken:req.session.csrf};}
 @Post('login') async login(@Req() req:Request,@Body() b:LoginDto){if(!adminConfigured())throw new NotFoundException();
 const [a]=await this.db.query('SELECT a.id,a.password_hash,a.active AS account_active,a.session_version,a.platform_only,a.terms_version,p.* FROM account a JOIN platform_admin p ON p.user_id=a.id WHERE lower(a.email)=lower($1)',[b.email]);
 if(!a||!a.active||!a.account_active||new Date(a.locked_until??0).getTime()>Date.now())throw new UnauthorizedException('Connexion indisponible. Vérifiez vos identifiants.');
 const valid=await argon2.verify(a.password_hash,b.password).catch(()=>false);
 if(!valid){await this.failed(a.id);throw new UnauthorizedException('Connexion indisponible. Vérifiez vos identifiants.');}
 if(a.invitation_hash&&!(a.platform_only&&a.terms_version==='ADMIN_ACTIVATED')&&(!b.invitation||hashInvitation(b.invitation)!==a.invitation_hash||new Date(a.invitation_expires_at).getTime()<Date.now()))throw new UnauthorizedException('Invitation valide necessaire.');
 await regenerate(req);
 const secret=a.totp_secret?undefined:newTotpSecret();
 req.session.adminChallenge={userId:a.id,version:a.version,accountVersion:a.session_version,expires:Date.now()+5*60000,...(secret?{enrollment:sealSecret(secret)}:{}),invitationHash:a.invitation_hash??undefined};
 await saveSession(req);
 return {status:secret?'MFA_ENROLLMENT_REQUIRED':'MFA_REQUIRED',csrfToken:req.session.csrf,...(secret?{secret,otpauthUri:otpUri(b.email,secret)}:{})};}
 @Post('mfa') async mfa(@Req() req:Request,@Body() b:MfaDto){
  if(!adminConfigured())throw new NotFoundException();
  const challenge=req.session.adminChallenge;
  if(!challenge||challenge.expires<=Date.now())throw new UnauthorizedException('Vérification expirée. Reconnectez-vous.');
  const result=await this.db.transaction(async em=>{
   const [a]=await em.query('SELECT a.id,a.email,a.session_version,a.active AS account_active,p.* FROM account a JOIN platform_admin p ON p.user_id=a.id WHERE a.id=$1 FOR UPDATE OF a,p',[challenge.userId]);
   if(!a||!a.active||!a.account_active||a.version!==challenge.version||a.session_version!==challenge.accountVersion||new Date(a.locked_until??0).getTime()>Date.now())return null;
   // A second parallel enrollment must never replace an already registered factor.
   if(challenge.enrollment&&a.totp_secret&&!challenge.reset)return null;
   if(!challenge.enrollment&&!a.totp_secret)return null;
   const secret=openSecret(challenge.enrollment??a.totp_secret);
   const counter=verifyTotp(secret,b.code,challenge.enrollment?-1:Number(a.last_counter));
   if(counter===null){await this.failed(a.id,em);return null;}
   const recoveryCodes=challenge.enrollment?Array.from({length:8},()=>randomBytes(16).toString('hex')):undefined;
   await em.query('UPDATE platform_admin SET totp_secret=$2,last_counter=$3,recovery_hashes=COALESCE($4::text[],recovery_hashes),invitation_hash=NULL,invitation_expires_at=NULL,failed_attempts=0,locked_until=NULL WHERE user_id=$1',[a.id,sealSecret(secret),counter,recoveryCodes?.map(hashInvitation)??null]);
   await audit(em,a.id,challenge.enrollment?'ADMIN_MFA_ENROLLED':'ADMIN_MFA_VERIFIED',a.id);
   return {a,recoveryCodes};
  });
  if(!result)throw new UnauthorizedException('Code invalide, déjà utilisé ou vérification expirée.');
  await regenerate(req);const {a,recoveryCodes}=result;
  Object.assign(req.session,{adminMfaVerified:true,adminId:a.id,adminVersion:a.version,adminAccountVersion:a.session_version,adminVerifiedAt:Date.now(),adminActivityAt:Date.now(),adminAuthenticatedAt:Date.now()});
  await saveSession(req);await audit(this.db,a.id,'ADMIN_LOGIN',a.id);
  return {status:'AUTHENTICATED',role:a.role,csrfToken:req.session.csrf,...(recoveryCodes?{recoveryCodes}:{})};
 }
 @Post('mfa/recover') async recover(@Req() req:Request,@Body() b:MfaDto){
  if(!adminConfigured())throw new NotFoundException();
  const c=req.session.adminChallenge;
  if(!c||c.enrollment||c.expires<=Date.now())throw new UnauthorizedException();
  const a=await this.db.transaction(async em=>{
   const [a]=await em.query('SELECT a.email,a.session_version,a.active AS account_active,p.* FROM account a JOIN platform_admin p ON p.user_id=a.id WHERE a.id=$1 FOR UPDATE OF a,p',[c.userId]);
   if(!a||!a.active||!a.account_active||!a.totp_secret||a.version!==c.version||a.session_version!==c.accountVersion||new Date(a.locked_until??0).getTime()>Date.now())return null;
   const hash=hashInvitation(b.code.trim());
   if(!/^[a-f0-9]{32}$/.test(b.code.trim())||!a.recovery_hashes.includes(hash)){await this.failed(c.userId,em);return null;}
   await em.query('UPDATE platform_admin SET recovery_hashes=array_remove(recovery_hashes,$2),version=version+1,failed_attempts=0,locked_until=NULL WHERE user_id=$1',[c.userId,hash]);
   await em.query("DELETE FROM admin_session WHERE sess->>'adminId'=$1",[c.userId]);
   await audit(em,c.userId,'ADMIN_MFA_RECOVERY_STARTED',c.userId);
   return a;
  });
  if(!a)throw new UnauthorizedException('Code de secours invalide ou déjà utilisé.');
  await regenerate(req);const secret=newTotpSecret();
  req.session.adminChallenge={userId:c.userId,version:a.version+1,accountVersion:a.session_version,expires:Date.now()+5*60000,enrollment:sealSecret(secret),reset:true};
  await saveSession(req);return {status:'MFA_ENROLLMENT_REQUIRED',secret,otpauthUri:otpUri(a.email,secret),csrfToken:req.session.csrf};
 }
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
 private async failed(id:string,db:Pick<Database,'query'>=this.db){await db.query("UPDATE platform_admin SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts>=4 THEN now()+interval '15 minutes' ELSE locked_until END WHERE user_id=$1",[id]);await audit(db,id,'ADMIN_AUTH_FAILED',id);}
 @Get('me') @UseGuards(AdminGuard) async me(@Req() req:Request){const [a]=await this.db.query('SELECT id,email FROM account WHERE id=$1',[req.session.adminId]);const role=(req as any).adminRole as AdminRole;return {...a,role,permissions:ADMIN_PERMISSIONS[role],confirmedAt:req.session.adminVerifiedAt};}
 @Post('reauth') @UseGuards(AdminGuard) async reauth(@Req() req:Request,@Body() b:PasswordDto){
 const id=req.session.adminId!;
 const ok=await this.db.transaction(async em=>{
  const [a]=await em.query('SELECT a.password_hash,a.session_version,p.* FROM account a JOIN platform_admin p ON p.user_id=a.id WHERE a.id=$1 AND a.active AND p.active FOR UPDATE OF a,p',[id]);
  if(!a||a.version!==req.session.adminVersion||a.session_version!==req.session.adminAccountVersion||!a.totp_secret||new Date(a.locked_until??0).getTime()>Date.now())return false;
  const passwordValid=await argon2.verify(a.password_hash,b.password).catch(()=>false);
  const counter=passwordValid?verifyTotp(openSecret(a.totp_secret),b.code,Number(a.last_counter)):null;
  if(counter===null){await this.failed(id,em);return false;}
  await em.query('UPDATE platform_admin SET last_counter=$2,failed_attempts=0,locked_until=NULL WHERE user_id=$1',[id,counter]);
  await audit(em,id,'ADMIN_REAUTHENTICATED',id);return true;
 });
 if(!ok)throw new UnauthorizedException('Mot de passe ou code de sécurité invalide.');
 req.session.adminVerifiedAt=Date.now();await saveSession(req);return {ok:true};}
 @Post('logout') async logout(@Req() req:Request){if(req.session.adminId)await audit(this.db,req.session.adminId,'ADMIN_LOGOUT',req.session.adminId);await new Promise<void>(resolve=>req.session.destroy(()=>resolve()));return {ok:true};}
}

function otpUri(email:string,secret:string){return `otpauth://totp/${encodeURIComponent('InfiMatch Admin:'+email)}?secret=${secret}&issuer=InfiMatch%20Admin&algorithm=SHA1&digits=6&period=30`;}
