import {ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {Database,SqlClient,audit} from '../database/database';
import {requireActiveAccount} from '../common/access';
import type {ContractNotesDto,ContractPreparationDto} from './contracts.module';
const emptyNotes=():ContractNotesDto=>({reason:'',workSchedule:'',payTerms:'',contactName:'',additionalNotes:''});
function normalized(input:ContractNotesDto):ContractNotesDto {
 return Object.fromEntries(Object.keys(emptyNotes()).map(key=>[key,input[key as keyof ContractNotesDto].trim()])) as unknown as ContractNotesDto;
}
function text(value:unknown):string|null{return typeof value==='string'&&value.trim()?value.trim():null;}
@Injectable()
export class ContractsService {
 constructor(private readonly db:Database){}
 read(actor:string,id:string){return this.db.transaction(async em=>this.view(await this.context(em,actor,id,false)));}
 save(actor:string,id:string,body:ContractPreparationDto){return this.db.transaction(async em=>{
  const c=await this.context(em,actor,id,true);
  if(!c.canEdit)throw new ForbiddenException('Cette préparation est en lecture seule.');
  const notes=normalized(body.notes),current=c.preparation?.version??0;
  if(current!==body.version){
   if(current===body.version+1&&JSON.stringify(normalized(c.preparation.notes))===JSON.stringify(notes))return this.view(c);
   throw new ConflictException({code:'CONTRACT_PREPARATION_CHANGED',message:'La préparation a été modifiée. Rechargez la dernière version avant de réenregistrer.'});
  }
  const [saved]=await em.query(`INSERT INTO contract_preparation(assignment_id,version,notes,created_by,updated_by)
   VALUES($1,1,$2,$3,$3) ON CONFLICT(assignment_id) DO UPDATE SET notes=EXCLUDED.notes,
   version=contract_preparation.version+1,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *`,[id,JSON.stringify(notes),actor]);
  await audit(em,actor,'CONTRACT_PREPARATION_SAVED',id,{version:saved.version});
  return this.view({...c,preparation:saved});
 });}
 private async context(em:SqlClient,actor:string,id:string,write:boolean){
  await requireActiveAccount(em,actor);
  const [pointer]=await em.query('SELECT mission_id FROM assignment WHERE id=$1',[id]);
  if(!pointer)throw new NotFoundException();
  // Mission first, as in assignment cancellation; serialize writers on the assignment.
  const [mission]=await em.query('SELECT * FROM mission WHERE id=$1 FOR SHARE',[pointer.mission_id]);
  const [assignment]=await em.query(`SELECT * FROM assignment WHERE id=$1 FOR ${write?'UPDATE':'SHARE'}`,[id]);
  if(!mission||!assignment)throw new NotFoundException();
  const members=await em.query('SELECT organization_id FROM membership WHERE user_id=$1 AND active AND organization_id IN($2,$3) FOR SHARE',[actor,mission.agency_id,mission.establishment_id]);
  if(actor!==assignment.nurse_id&&!members.length)throw new NotFoundException();
  const [workerAccount]=await em.query('SELECT active FROM account WHERE id=$1 FOR SHARE',[assignment.nurse_id]);
  const employerId=mission.agency_id??mission.establishment_id;
  const canEdit=workerAccount?.active&&assignment.status==='ACTIVE'&&members.some(m=>m.organization_id===employerId);
  const [employer]=await em.query('SELECT id,kind,name,address,siret,referent FROM organization WHERE id=$1',[employerId]);
  const [establishment]=await em.query('SELECT name,address,finess FROM organization WHERE id=$1',[mission.establishment_id]);
  const [worker]=await em.query('SELECT display_name,details FROM profile WHERE user_id=$1',[assignment.nurse_id]);
  const [preparation]=await em.query('SELECT version,notes,updated_at FROM contract_preparation WHERE assignment_id=$1',[id]);
  return {assignment,mission,employer,establishment,worker,preparation,canEdit};
 }
 private view(c:any){
  const notes=c.preparation?.notes??emptyNotes();
  const firstName=text(c.worker.details?.firstName),lastName=text(c.worker.details?.lastName);
  const missingInformation:string[]=[];
  for(const [label,value] of [
   ['Prénom du professionnel',firstName],['Nom du professionnel',lastName],
   ['Adresse de l’employeur',c.employer.address],['SIRET de l’employeur',c.employer.siret],
   ['Motif du recours',notes.reason],['Organisation du travail',notes.workSchedule],
   ['Éléments de rémunération',notes.payTerms],['Interlocuteur pour le contrat',notes.contactName],
  ])if(!text(value))missingInformation.push(label as string);
  return {
   assignment:{id:c.assignment.id,status:c.assignment.status},
   mission:{id:c.mission.id,title:c.mission.title,qualification:c.mission.qualification,service:c.mission.service,
    address:c.mission.address,startAt:c.assignment.start_at,endAt:c.assignment.end_at,timeZone:c.mission.timezone,hourlySalary:c.mission.hourly_salary},
   employer:{id:c.employer.id,kind:c.employer.kind,name:c.employer.name,address:c.employer.address,siret:c.employer.siret,contact:c.employer.referent},
   establishment:c.establishment,
   worker:{displayName:[firstName,lastName].filter(Boolean).join(' ')||c.worker.display_name,firstName,lastName},
   canEdit:c.canEdit,preparation:{version:c.preparation?.version??0,notes,updatedAt:c.preparation?.updated_at??null},missingInformation,
   notice:'Brouillon de préparation uniquement. Les informations du profil et de la mission sont préremplies à partir des données actuelles et restent à vérifier. Cette préparation ne constitue ni un contrat signé ni une validation juridique.',
  };
 }
}
