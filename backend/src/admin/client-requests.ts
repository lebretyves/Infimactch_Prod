import {Body,Controller,Get,Post,Req,Param,Query,UseGuards,ParseUUIDPipe,ConflictException,NotFoundException} from '@nestjs/common';
import {Request} from 'express';
import {Equals,IsOptional,IsString,IsUUID,Length} from 'class-validator';
import {randomBytes} from 'node:crypto';
import {Database,audit} from '../database/database';
import {PageDto} from '../common/page.dto';
import {AdminGuard,authorizeAdmin} from './admin-auth';
import {recoveryHash} from '../auth/recovery';
import {closureBlockers,lockClosure} from '../security/closure-blockers';
import {executeClosure} from '../security/closure';
class Search extends PageDto {@IsOptional() @IsUUID() accountId?:string;}
class Reason {@IsString() @Length(8,500) reason!:string;}
class Issue extends Reason {@Equals(true) identityVerified!:boolean;}
const privacyFields='r.id,r.account_id,a.email,r.status,r.requested_at,r.approved_at,r.completed_at,r.decision_reason,r.last_error';
@Controller('admin') @UseGuards(AdminGuard)
export class AdminClientRequestsController {
 constructor(private readonly db:Database){}
 private async page(sql:string,p:Search){const params=[p.accountId??null];const [count]=await this.db.query('SELECT count(*)::int total FROM ('+sql+') x',params);const items=await this.db.query(sql+' LIMIT $2 OFFSET $3',[...params,p.limit,p.offset]);return {items,total:count.total,limit:p.limit,offset:p.offset};}
 @Get('recovery-requests') listRecovery(@Req() r:Request,@Query() p:Search){authorizeAdmin(r,'accounts');return this.page('SELECT r.id,r.account_id,a.email,r.status,r.requested_at,r.issued_at,r.expires_at,r.completed_at,r.decision_reason FROM recovery_request r JOIN account a ON a.id=r.account_id WHERE ($1::uuid IS NULL OR r.account_id=$1) ORDER BY r.requested_at DESC,r.id',p);}
 @Post('recovery-requests/:id/issue') async issue(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:Issue){
  const actor=authorizeAdmin(r,'accounts:recover',true),token=randomBytes(32).toString('hex');
  const base=new URL(process.env.APP_ORIGIN!);if(base.protocol!=='https:' && !(process.env.NODE_ENV==='test' && ['127.0.0.1','localhost'].includes(base.hostname)))throw Error('Trusted HTTPS app origin required');
  const expiresAt=await this.db.transaction(async em=>{
   await em.query('SELECT pg_advisory_xact_lock(1789381700)');
   const [candidate]=await em.query('SELECT account_id FROM recovery_request WHERE id=$1',[id]);if(!candidate)throw new NotFoundException();
   const [a]=await em.query('SELECT id,active,platform_only,session_version FROM account WHERE id=$1 FOR UPDATE',[candidate.account_id]);
   const [row]=await em.query('SELECT status FROM recovery_request WHERE id=$1 FOR UPDATE',[id]);
   const admin=await em.query('SELECT 1 FROM platform_admin WHERE user_id=$1',[candidate.account_id]);
   const closing=await em.query("SELECT 1 FROM closure_request WHERE account_id=$1 AND status IN('APPROVED','PROCESSING')",[candidate.account_id]);
   if(!a?.active||a.platform_only||admin.length||closing.length||!['REQUESTED','ISSUED'].includes(row?.status))throw new ConflictException('Demande non eligible a la recuperation.');
   const [updated]=await em.query("UPDATE recovery_request SET status='ISSUED',issued_at=now(),expires_at=now()+interval '30 minutes',token_hash=$2,account_version=$3,issued_by=$4,decision_reason=$5 WHERE id=$1 RETURNING expires_at",[id,recoveryHash(token),a.session_version,actor,b.reason]);
   await audit(em,actor,'ADMIN_RECOVERY_LINK_CREATED',id,{reason:b.reason,identityVerified:true});return updated.expires_at;
  });
  return {id,status:'ISSUED',resetUrl:new URL('/reinitialiser-mot-de-passe',base.origin).toString()+'#token='+token,expiresAt};
 }
 @Post('recovery-requests/:id/reject') async rejectRecovery(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:Reason){const actor=authorizeAdmin(r,'accounts:recover',true);return this.db.transaction(async em=>{const rows=await em.query("UPDATE recovery_request SET status='REJECTED',token_hash=NULL,decision_reason=$2,issued_by=$3 WHERE id=$1 AND status IN('REQUESTED','ISSUED') RETURNING id",[id,b.reason,actor]);if(!rows.length)throw new ConflictException('Cette demande ne peut plus etre refusee.');await audit(em,actor,'ADMIN_RECOVERY_REJECTED',id,{reason:b.reason});return {ok:true};});}
 @Get('privacy-requests') listPrivacy(@Req() r:Request,@Query() p:Search){authorizeAdmin(r,'accounts');return this.page('SELECT '+privacyFields+' FROM closure_request r JOIN account a ON a.id=r.account_id WHERE ($1::uuid IS NULL OR r.account_id=$1) ORDER BY r.requested_at DESC,r.id',p);}
 @Get('privacy-requests/:id') async privacy(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string){authorizeAdmin(r,'accounts');const [row]=await this.db.query('SELECT '+privacyFields+' FROM closure_request r JOIN account a ON a.id=r.account_id WHERE r.id=$1',[id]);if(!row)throw new NotFoundException();const blockers=row.status==='PROCESSING'?[]:await closureBlockers(this.db,row.account_id);return {request:row,blockers,canExecute:['APPROVED','PROCESSING'].includes(row.status)&&!blockers.length};}
 private async decision(r:Request,id:string,b:Reason,status:'APPROVED'|'REJECTED'){
  const actor=authorizeAdmin(r,'privacy:write',true);return this.db.transaction(async em=>{
   const [candidate]=await em.query('SELECT account_id FROM closure_request WHERE id=$1',[id]);if(!candidate)throw new NotFoundException();await lockClosure(em,candidate.account_id);
   const [row]=await em.query('SELECT status FROM closure_request WHERE id=$1 FOR UPDATE',[id]);if(!(status==='APPROVED'?['REQUESTED']:['REQUESTED','APPROVED']).includes(row?.status))throw new ConflictException('Etat de demande incompatible.');
   if(status==='APPROVED'){const blockers=await closureBlockers(em,candidate.account_id);if(blockers.length)throw new ConflictException({code:'CLOSURE_BLOCKED',message:blockers.map(b=>b.label).join(' ')});}
   await em.query("UPDATE closure_request SET status=$2,approved_at=CASE WHEN $2='APPROVED' THEN now() ELSE approved_at END,decision_reason=$3,reviewed_by=$4,last_error=NULL WHERE id=$1",[id,status,b.reason,actor]);await audit(em,actor,'ADMIN_CLOSURE_'+status,id,{reason:b.reason});return {ok:true};
  });
 }
 @Post('privacy-requests/:id/approve') approve(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:Reason){return this.decision(r,id,b,'APPROVED');}
 @Post('privacy-requests/:id/reject') reject(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:Reason){return this.decision(r,id,b,'REJECTED');}
 @Post('privacy-requests/:id/execute') async execute(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:Reason){
  const actor=authorizeAdmin(r,'privacy:write',true),[row]=await this.db.query('SELECT account_id,status FROM closure_request WHERE id=$1',[id]);if(!row)throw new NotFoundException();if(!['APPROVED','PROCESSING'].includes(row.status))throw new ConflictException('La demande doit etre approuvee avant execution.');
  await audit(this.db,actor,'ADMIN_CLOSURE_EXECUTION_REQUESTED',id,{reason:b.reason});
  try{await executeClosure(this.db,row.account_id,id);}catch(e){if(e instanceof ConflictException)throw e;await this.db.query("UPDATE closure_request SET last_error='CLOSURE_RETRY_REQUIRED' WHERE id=$1 AND status IN('APPROVED','PROCESSING')",[id]);const [current]=await this.db.query('SELECT status,last_error FROM closure_request WHERE id=$1',[id]);if(current.status==='PROCESSING')return {ok:true,...current};throw new ConflictException('Cloture interrompue. Verifiez les services puis reprenez la demande.');}
  const [current]=await this.db.query('SELECT status,last_error FROM closure_request WHERE id=$1',[id]);if(!['COMPLETED','PROCESSING'].includes(current.status))throw new ConflictException('La demande a change. Actualisez la page.');return {ok:true,...current};
 }
}
