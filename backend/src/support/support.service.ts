import {BadRequestException,ConflictException,HttpException,Injectable,NotFoundException} from '@nestjs/common';
import {Database} from '../database/database';
export const SUPPORT_CATEGORIES=['ACCESS','PROFILE','MISSION','DOCUMENT','NOTIFICATION','OTHER'];
export function supportText(value:unknown,min:number,max:number){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new BadRequestException('Vérifiez la longueur et le contenu du message.');return value.trim();}
export function supportOffset(value?:string){if(value===undefined)return 0;if(!/^\d{1,6}$/.test(value)||Number(value)>100000)throw new BadRequestException('Page non valide.');return Number(value);}
@Injectable()
export class SupportService {
 constructor(private readonly db:Database){}
 async create(actor:string,b:{clientRequestId:string;category:string;subject:string;description:string}){
  if(!SUPPORT_CATEGORIES.includes(b.category))throw new BadRequestException('Catégorie non valide.');
  const subject=supportText(b.subject,3,150),description=supportText(b.description,10,4000);
  return this.db.transaction(async em=>{
   if(!(await em.query('SELECT id FROM account WHERE id=$1 AND active FOR UPDATE',[actor])).length)throw new NotFoundException('Compte indisponible.');
   const [old]=await em.query('SELECT * FROM support_ticket WHERE owner_id=$1 AND client_request_id=$2',[actor,b.clientRequestId]);
   if(old){if(old.subject!==subject||old.description!==description||old.category!==b.category)throw new ConflictException('Cette référence a déjà été utilisée pour une autre demande.');return {id:old.id,status:old.status,created_at:old.created_at};}
   const [count]=await em.query("SELECT count(*)::int AS n FROM support_ticket WHERE owner_id=$1 AND created_at>now()-interval '1 hour'",[actor]);
   if(count.n>=5)throw new HttpException('Vous avez déjà envoyé cinq demandes en une heure. Patientez avant de réessayer.',429);
   const [ticket]=await em.query('INSERT INTO support_ticket(owner_id,client_request_id,category,subject,description) VALUES($1,$2,$3,$4,$5) RETURNING id,status,created_at',[actor,b.clientRequestId,b.category,subject,description]);
   await em.query("INSERT INTO notification(user_id,kind,message,href) VALUES($1,'SUPPORT_RECEIVED',$2,$3)",[actor,'Votre demande de support a été enregistrée. Référence : '+ticket.id,'/aide?ticket='+ticket.id]);
   return ticket;
  });
 }
 async list(actor:string,offset:number,staff=false){const params:unknown[]=staff?[offset]:[actor,offset];const rows=await this.db.query(`SELECT id,category,subject,status,created_at,updated_at FROM support_ticket ${staff?'':'WHERE owner_id=$1'} ORDER BY updated_at DESC,id LIMIT 21 OFFSET $${staff?1:2}`,params);return {items:rows.slice(0,20),hasMore:rows.length>20};}
 async detail(actor:string,id:string,offset:number,staff=false){const [ticket]=await this.db.query(`SELECT id,category,subject,description,status,created_at,updated_at FROM support_ticket WHERE id=$1 ${staff?'':'AND owner_id=$2'}`,staff?[id]:[id,actor]);if(!ticket)throw new NotFoundException('Demande introuvable.');const replies=await this.db.query('SELECT id,body,is_staff,created_at FROM support_reply WHERE ticket_id=$1 ORDER BY created_at,id LIMIT 21 OFFSET $2',[id,offset]);return {ticket,replies:replies.slice(0,20),hasMore:replies.length>20};}
 async reply(actor:string,id:string,b:{clientRequestId:string;body:string;status?:string},staff=false){const body=supportText(b.body,2,4000);if(b.status&&!['OPEN','RESOLVED'].includes(b.status))throw new BadRequestException('Statut non valide.');if(!staff&&b.status)throw new BadRequestException('Seul le support peut modifier le statut.');
  return this.db.transaction(async em=>{
   if(!(await em.query('SELECT id FROM account WHERE id=$1 AND active FOR UPDATE',[actor])).length)throw new NotFoundException('Compte indisponible.');
   const [ticket]=await em.query(`SELECT * FROM support_ticket WHERE id=$1 ${staff?'':'AND owner_id=$2'} FOR UPDATE`,staff?[id]:[id,actor]);if(!ticket)throw new NotFoundException('Demande introuvable.');
   const [old]=await em.query('SELECT id,body FROM support_reply WHERE ticket_id=$1 AND author_id=$2 AND client_request_id=$3',[id,actor,b.clientRequestId]);if(old){if(old.body!==body)throw new ConflictException('Référence déjà utilisée.');return {id:old.id};}
   const [count]=await em.query("SELECT count(*)::int AS n FROM support_reply WHERE author_id=$1 AND created_at>now()-interval '1 hour'",[actor]);if(count.n>=40)throw new HttpException('Trop de réponses en une heure. Patientez.',429);
   const [reply]=await em.query('INSERT INTO support_reply(ticket_id,author_id,is_staff,client_request_id,body) VALUES($1,$2,$3,$4,$5) RETURNING id',[id,actor,staff,b.clientRequestId,body]);
   await em.query('UPDATE support_ticket SET status=$2,updated_at=now() WHERE id=$1',[id,staff?(b.status||ticket.status):'OPEN']);
   if(staff)await em.query("INSERT INTO notification(user_id,kind,message,href) VALUES($1,'SUPPORT_REPLY','Une réponse est disponible pour votre demande de support.',$2)",[ticket.owner_id,'/aide?ticket='+id]);
   await em.query("INSERT INTO audit(actor_id,event,resource_id,details) VALUES($1,'SUPPORT_REPLY',$2,$3)",[actor,id,JSON.stringify({staff})]);return reply;
  });
 }
}
