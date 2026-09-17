import {Body,Controller,Get,Post,Req,Param,Query,UseGuards,ParseUUIDPipe,ConflictException,NotFoundException,Injectable} from '@nestjs/common';
import {Request} from 'express';
import {Equals,IsIn,IsString,Length} from 'class-validator';
import {Database,audit,queueProfileMatches} from '../database/database';
import {SessionGuard,user,nurse} from '../common/access';
import {PageDto} from '../common/page.dto';
import {AdminGuard,authorizeAdmin} from '../admin/admin-auth';
import {correctionFields,correctionValue,CorrectionField} from './personal-information';
export class CorrectionDto {@IsIn(correctionFields) field!:CorrectionField;@IsString() @Length(0,500) value!:string;}
class Reason {@IsString() @Length(8,500) reason!:string;}
class Approval extends Reason {@Equals(true) identityVerified!:boolean;}
@Injectable()
export class PersonalCorrectionsService {
 constructor(private readonly db:Database){}
 async request(actor:string,b:CorrectionDto){const value=correctionValue(b.field,b.value);return this.db.transaction(async em=>{
  const [a]=await em.query('SELECT email FROM account WHERE id=$1 AND active AND NOT platform_only FOR UPDATE',[actor]);if(!a)throw new NotFoundException();
  const p=await nurse(em,actor);const previous=b.field==='email'?a.email:(p.details?.[b.field]??'');
  if(value===previous)throw new ConflictException('Cette valeur est déjà enregistrée.');
  if((await em.query("SELECT id FROM personal_correction_request WHERE account_id=$1 AND status='REQUESTED'",[actor])).length)throw new ConflictException('Une demande est déjà en cours. Attendez son traitement avant une nouvelle demande.');
  const [row]=await em.query('INSERT INTO personal_correction_request(account_id,field,proposed_value,previous_value) VALUES($1,$2,$3,$4) RETURNING id,status,requested_at',[actor,b.field,value,previous]);
  await audit(em,actor,'PERSONAL_CORRECTION_REQUESTED',row.id,{field:b.field});return row;
 });}
 async decide(actor:string,id:string,b:{reason:string;identityVerified?:boolean},approve:boolean){return this.db.transaction(async em=>{
  const [candidate]=await em.query('SELECT account_id FROM personal_correction_request WHERE id=$1',[id]);if(!candidate)throw new NotFoundException();
  const [a]=await em.query('SELECT email,active,platform_only FROM account WHERE id=$1 FOR UPDATE',[candidate.account_id]);
  const p=await nurse(em,candidate.account_id);
  const [r]=await em.query('SELECT * FROM personal_correction_request WHERE id=$1 FOR UPDATE',[id]);
  if(r?.status!=='REQUESTED')throw new ConflictException('Cette demande a déjà été traitée.');
  if(approve){
   if(b.identityVerified!==true)throw new ConflictException('Vérifiez l’identité avant de corriger les informations.');
   if(!a?.active||a.platform_only||(await em.query("SELECT id FROM closure_request WHERE account_id=$1 AND status IN('APPROVED','PROCESSING','COMPLETED')",[r.account_id])).length)throw new ConflictException('Ce compte ne peut plus être corrigé.');
   const value=correctionValue(r.field,r.proposed_value),current=r.field==='email'?a.email:(p.details?.[r.field]??'');
   if(current!==r.previous_value)throw new ConflictException('Les informations ont changé depuis la demande. Refusez-la et demandez une nouvelle correction.');
   if(r.field==='email'){
    if((await em.query('SELECT id FROM account WHERE lower(email)=lower($1) AND id<>$2',[value,r.account_id])).length)throw new ConflictException('Cette adresse e-mail est déjà utilisée.');
    await em.query('UPDATE account SET email=$2,session_version=session_version+1 WHERE id=$1',[r.account_id,value]);
    await em.query("DELETE FROM session WHERE sess->>'userId'=$1",[r.account_id]);
    await em.query("UPDATE recovery_request SET status='REJECTED',token_hash=NULL,decision_reason='Adresse e-mail corrigée par un administrateur' WHERE account_id=$1 AND status IN('REQUESTED','ISSUED')",[r.account_id]);
   }else{
    const details={...p.details};if(value)details[r.field]=value;else delete details[r.field];
    const identityChanged=['firstName','lastName'].includes(r.field);
    await em.query("UPDATE profile SET details=$2,display_name=$3,rpps_status=CASE WHEN $4 THEN 'NOT_CHECKED' ELSE rpps_status END,rpps_identity_review=CASE WHEN $4 THEN 'NOT_CHECKED' ELSE rpps_identity_review END,rpps_checked_at=CASE WHEN $4 THEN NULL ELSE rpps_checked_at END,rpps_version=rpps_version+CASE WHEN $4 THEN 1 ELSE 0 END,updated_at=now() WHERE user_id=$1",[r.account_id,JSON.stringify(details),r.field==='firstName'?value:p.display_name,identityChanged]);
    await queueProfileMatches(em,r.account_id);
   }
  }
  await em.query('UPDATE personal_correction_request SET status=$2,completed_at=now(),reviewed_by=$3,decision_reason=$4 WHERE id=$1',[id,approve?'COMPLETED':'REJECTED',actor,b.reason]);
  await audit(em,actor,approve?'ADMIN_PERSONAL_CORRECTION_APPLIED':'ADMIN_PERSONAL_CORRECTION_REJECTED',id,{accountId:r.account_id,field:r.field});return {ok:true};
 });}
}
@Controller('me/personal-corrections') @UseGuards(SessionGuard)
export class PersonalCorrectionsController {
 constructor(private readonly db:Database,private readonly service:PersonalCorrectionsService){}
 @Get() async get(@Req() r:Request){const [request]=await this.db.query('SELECT id,field,proposed_value,status,requested_at,completed_at,decision_reason FROM personal_correction_request WHERE account_id=$1 ORDER BY requested_at DESC,id DESC LIMIT 1',[user(r)]);return {request:request??null};}
 @Post() post(@Req() r:Request,@Body() b:CorrectionDto){return this.service.request(user(r),b);}
}
@Controller('admin/personal-corrections') @UseGuards(AdminGuard)
export class AdminPersonalCorrectionsController {
 constructor(private readonly db:Database,private readonly service:PersonalCorrectionsService){}
 @Get() async list(@Req() r:Request,@Query() p:PageDto){authorizeAdmin(r,'accounts');const [count]=await this.db.query('SELECT count(*)::int total FROM personal_correction_request');const items=await this.db.query('SELECT r.*,a.email FROM personal_correction_request r JOIN account a ON a.id=r.account_id ORDER BY r.requested_at DESC,r.id DESC LIMIT $1 OFFSET $2',[p.limit,p.offset]);return {items,total:count.total,limit:p.limit,offset:p.offset};}
 @Post(':id/approve') approve(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:Approval){return this.service.decide(authorizeAdmin(r,'accounts:write',true),id,b,true);}
 @Post(':id/reject') reject(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string,@Body() b:Reason){return this.service.decide(authorizeAdmin(r,'accounts:write',true),id,b,false);}
}
