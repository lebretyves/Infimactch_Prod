import {Body,Controller,Get,Post,Req,Res,Module,UnauthorizedException,ServiceUnavailableException} from '@nestjs/common';
import {IsIn} from 'class-validator';
import {Request,Response} from 'express';
import {createHash,randomBytes} from 'node:crypto';
import {Database,audit} from '../database/database';
import {PscProvider,pscConfiguration} from './psc';
import {sealSecret,openSecret} from '../admin/mfa';
class BeginDto {@IsIn(['login','link']) purpose!:'login'|'link';}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
@Controller('auth/psc')
export class PscController {
 constructor(private readonly db:Database,private readonly provider:PscProvider){}
 @Get('config') config(){return {enabled:!!pscConfiguration(),environment:pscConfiguration()?process.env.PSC_ENVIRONMENT:null};}
 @Post('start') async start(@Req() req:Request,@Body() b:BeginDto){if(!pscConfiguration())throw new ServiceUnavailableException('PSC_DISABLED');let actor:string|null=null,version:number|null=null;
 if(b.purpose==='link'){if(!req.session.userId||req.session.family!=='NURSE'||Date.now()-(req.session.authenticatedAt??0)>5*60000)throw new UnauthorizedException('Reconnectez-vous avant d’associer votre identité professionnelle.');const [a]=await this.db.query("SELECT id,session_version FROM account WHERE id=$1 AND active AND family='NURSE' AND session_version=$2",[req.session.userId,req.session.sessionVersion]);if(!a)throw new UnauthorizedException();actor=a.id;version=a.session_version;}
 const flow=await this.provider.begin();await this.db.transaction(async em=>{await em.query('DELETE FROM psc_challenge WHERE session_hash=$1 OR expires_at<now()',[hash(req.sessionID)]);await em.query("INSERT INTO psc_challenge(state_hash,session_hash,user_id,account_version,nonce,verifier,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '5 minutes')",[hash(flow.state),hash(req.sessionID),actor,version,flow.nonce,sealSecret(flow.verifier)]);});await new Promise<void>((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));return {url:flow.url};}
 @Get('callback') async callback(@Req() req:Request,@Res() res:Response){const conf=pscConfiguration();if(!conf)return res.redirect(303,process.env.APP_ORIGIN+'/connexion?psc=indisponible');let actor:string|null=null;
 try{const state=typeof req.query.state==='string'?req.query.state:'';if(!state||state.length>200)throw new UnauthorizedException();const [c]=await this.db.query('DELETE FROM psc_challenge WHERE state_hash=$1 AND session_hash=$2 AND expires_at>now() RETURNING *',[hash(state),hash(req.sessionID)]);if(!c)throw new UnauthorizedException();actor=c.user_id;
 if(req.query.error)return res.redirect(303,process.env.APP_ORIGIN+'/connexion?psc=annule');
 const url=new URL(conf.callback);for(const key of ['code','state','iss']){const value=req.query[key];if(typeof value==='string')url.searchParams.set(key,value);}
 const identity=await this.provider.complete(url,{state,nonce:c.nonce,verifier:openSecret(c.verifier)});
 const account=await this.db.transaction(async em=>{if(actor){if(req.session.userId!==actor||req.session.sessionVersion!==c.account_version)throw new UnauthorizedException();const [a]=await em.query("SELECT id,family,session_version FROM account WHERE id=$1 AND active AND family='NURSE' AND session_version=$2 FOR SHARE",[actor,c.account_version]);if(!a)throw new UnauthorizedException();await em.query('INSERT INTO professional_identity(user_id,issuer,subject_name_id,subject) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,issuer) DO UPDATE SET authenticated_at=now(),subject=EXCLUDED.subject WHERE professional_identity.subject_name_id=EXCLUDED.subject_name_id',[actor,conf.issuer,identity.subjectNameId,identity.subject]);const [linked]=await em.query('SELECT user_id FROM professional_identity WHERE issuer=$1 AND subject_name_id=$2',[conf.issuer,identity.subjectNameId]);if(linked?.user_id!==actor)throw new UnauthorizedException();await audit(em,actor,'PSC_IDENTITY_LINKED',actor);return a;}
 const [a]=await em.query('SELECT a.id,a.family,a.session_version FROM account a JOIN professional_identity p ON p.user_id=a.id WHERE p.issuer=$1 AND p.subject_name_id=$2 AND a.active',[conf.issuer,identity.subjectNameId]);if(!a)return null;await em.query('UPDATE professional_identity SET authenticated_at=now(),subject=$3 WHERE issuer=$1 AND subject_name_id=$2',[conf.issuer,identity.subjectNameId,identity.subject]);await audit(em,a.id,'PSC_LOGIN',a.id);return a;});
 if(!account)return res.redirect(303,process.env.APP_ORIGIN+'/connexion?psc=association-requise');
 await new Promise<void>((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.userId=account.id;req.session.family=account.family;req.session.sessionVersion=account.session_version;req.session.csrf=randomBytes(32).toString('hex');req.session.authenticatedAt=Date.now();req.session.lastActivityAt=Date.now();await new Promise<void>((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));return res.redirect(303,process.env.APP_ORIGIN+(actor?'/profil?psc=associe':'/accueil'));
 }catch{await audit(this.db,actor,'PSC_AUTH_FAILED',actor,{reason:'PROVIDER_OR_IDENTITY_CHECK_FAILED'}).catch(()=>{});return res.redirect(303,process.env.APP_ORIGIN+'/connexion?psc=echec');}}
}
@Module({controllers:[PscController],providers:[PscProvider]})
export class PscModule {}
