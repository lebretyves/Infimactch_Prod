import {demoNoticeSuppressed} from '../notifications/demo-suppression';
import {EMAIL_CORRELATION_HEADER} from './email-delivery';
import {randomUUID} from 'node:crypto';
import {Database, SqlClient} from '../database/database';
import {DocumentsService} from '../documents/documents.module';
import {createConfirmationPdf, ConfirmationDetails} from './confirmation-pdf';

// Identity fields are maintained by registration and administrator-approved corrections.
// Keep legacy display names when a complete identity is unavailable; never infer a surname.
export function professionalIdentityName(person: {first_name?: unknown; last_name?: unknown; professional_name?: unknown} | null | undefined): string | undefined {
  const text = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  const first = text(person?.first_name), last = text(person?.last_name);
  return (first && last ? first + ' ' + last : text(person?.professional_name) || first || last) || undefined;
}

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function missionEmailContent(kind:'CONFIRMATION'|'CANCELLATION', title:string, href:string, initiator?:string) {
  const heading=kind==='CONFIRMATION'?'Votre mission est confirmée':'Annulation de mission';
  const message=kind==='CONFIRMATION'?'L’affectation est confirmée. Retrouvez les dates, horaires et le lieu dans le PDF joint et dans votre agenda InfiMatch.':initiator==='NURSE'?'L’intérimaire a annulé son affectation. Le créneau a été libéré. Le PDF d’annulation est joint à ce message.':'L’entreprise a annulé la mission. Le créneau a été libéré. Le PDF d’annulation est joint à ce message.';
  return {subject:heading+' — '+title,
    text:heading+'\n'+title+'\n\n'+message+'\n\nSuivre la mission : '+href,
    html:`<!doctype html><html lang="fr"><body style="margin:0;background:#f1f6fe;font-family:Arial,sans-serif;color:#0a2540"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:600px;margin:auto;background:white;border-radius:16px" cellspacing="0" cellpadding="28"><tr><td style="border-top:6px solid #1466e0"><strong style="font-size:26px">Infi<span style="color:#1466e0">Match</span></strong><h1 style="font-size:24px;color:#1466e0">${escapeHtml(heading)}</h1><h2 style="font-size:19px">${escapeHtml(title)}</h2><p style="line-height:1.7">${escapeHtml(message)}</p><p style="padding:18px 0"><a href="${escapeHtml(href)}" style="background:#1466e0;color:white;padding:14px 20px;border-radius:8px;text-decoration:none">Consulter la mission</a></p><p style="font-size:12px;color:#4f6480">Ce message concerne une affectation enregistrée dans InfiMatch. Le document joint reprend son statut au moment de son émission.</p></td></tr></table></td></tr></table></body></html>`};
}
export async function cancellationRecord(em:SqlClient,m:any,a:any,initiator:'NURSE'|'ENTERPRISE',reason='') {
  const [names]=await em.query('SELECT p.display_name AS professional_name,p.details->>\'firstName\' AS first_name,p.details->>\'lastName\' AS last_name,e.name AS establishment_name,e.referent AS establishment_contact,g.name AS agency_name FROM profile p LEFT JOIN organization e ON e.id=$2 LEFT JOIN organization g ON g.id=$3 WHERE p.user_id=$1',[a.nurse_id,m.establishment_id,m.agency_id]);
  const details:ConfirmationDetails={assignmentId:a.id,missionId:m.id,missionVersion:m.version,title:m.title,qualification:m.qualification,service:m.service,address:m.address,start:a.start_at,end:a.end_at,timezone:m.timezone,schedulePrecision:m.schedule_precision,hourlySalary:m.hourly_salary,professionalName:professionalIdentityName(names),establishmentName:names?.establishment_name,establishmentContact:names?.establishment_contact,agencyName:names?.agency_name,population:m.population,block:m.block,cancellation:{initiator,cancelledAt:new Date().toISOString(),reason}};
  await em.query('INSERT INTO mission_cancellation(assignment_id,details) VALUES($1,$2) ON CONFLICT DO NOTHING',[a.id,JSON.stringify(details)]);
}
export async function queueMissionEmails(em:SqlClient,m:any,a:any,kind:'CONFIRMATION'|'CANCELLATION',documentId:string,initiator?:string) {
  const recipients=await em.query("SELECT a.id,a.email,CASE WHEN a.id=$3::uuid THEN NULL WHEN EXISTS(SELECT 1 FROM membership s WHERE s.user_id=a.id AND s.organization_id=$1 AND s.active) THEN $1::uuid ELSE $2::uuid END AS organization_id FROM account a WHERE a.active AND (a.id=$3::uuid OR EXISTS(SELECT 1 FROM membership s WHERE s.user_id=a.id AND s.active AND s.organization_id IN($1,$2))) ORDER BY a.id",[m.agency_id,m.establishment_id,a.nurse_id]);
  const origin=process.env.NOTIFICATION_APP_ORIGIN || process.env.APP_ORIGIN;
  if(!origin)throw new Error('APP_ORIGIN_REQUIRED');
  for(const r of recipients) {
    const href=new URL((r.id===a.nurse_id?'/missions/m_':'/gestion/missions/')+m.id,origin).href;
    const payload=missionEmailContent(kind,m.title,href,initiator);
    await em.query('INSERT INTO mission_email(assignment_id,user_id,organization_id,kind,document_id,recipient,payload) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',[a.id,r.id,r.organization_id,kind,documentId,r.email,JSON.stringify(payload)]);
  }
}
export async function generateCancellations(db:Database,documents:DocumentsService,limit=3) {
  let generated=0;
  for(let i=0;i<limit;i++) {
    const row=await db.transaction(async em=>{
      const [c]=await em.query("SELECT c.*,a.nurse_id,a.mission_id FROM mission_cancellation c JOIN assignment a ON a.id=c.assignment_id WHERE c.status='PENDING' AND c.attempts<5 AND c.available_at<=now() AND (c.lease_until IS NULL OR c.lease_until<now()) ORDER BY c.created_at LIMIT 1 FOR UPDATE OF c SKIP LOCKED");
      if(!c)return null;
      c.token=randomUUID();
      await em.query("UPDATE mission_cancellation SET attempts=attempts+1,lease_token=$2,lease_until=now()+interval '2 minutes' WHERE id=$1",[c.id,c.token]);
      return c;
    });
    if(!row)break;
    try {
      const pdf=await createConfirmationPdf({...row.details,issuedAt:new Date(row.created_at)});
      const stored=await documents.store(row.nurse_id,'CANCELLATION','application/pdf',pdf,row.assignment_id,{operation:'mission-cancellation:'+row.id,key:row.id,content:{cancellationId:row.id}});
      await db.transaction(async em=>{
        const [lease]=await em.query('SELECT lease_token FROM mission_cancellation WHERE id=$1 FOR UPDATE',[row.id]);
        if(lease?.lease_token!==row.token)return;
        const [m]=await em.query('SELECT * FROM mission WHERE id=$1',[row.mission_id]);
        await queueMissionEmails(em,{...m,title:row.details.title},{id:row.assignment_id,nurse_id:row.nurse_id},'CANCELLATION',stored.id,row.details.cancellation.initiator);
        await em.query("UPDATE mission_cancellation SET status='READY',document_id=$2,lease_until=NULL WHERE id=$1",[row.id,stored.id]);
      });
      generated++;
    } catch {
      await db.query("UPDATE mission_cancellation SET status=CASE WHEN attempts>=5 THEN 'FAILED' ELSE 'PENDING' END,lease_until=NULL,available_at=now()+interval '60 seconds' WHERE id=$1 AND lease_token=$2",[row.id,row.token]);
    }
  }
  return generated;
}
export async function dispatchMissionEmails(db:Database,documents:DocumentsService,limit=3,transport:typeof fetch=fetch) {
  if(!process.env.SMTP2GO_API_KEY || !process.env.SMTP2GO_FROM)return {configured:false,sent:0};
  let sent=0;
  // An interrupted SMTP2GO request may already have sent the message: never replay it blindly.
  await db.query("UPDATE mission_email SET status='UNCERTAIN',last_error='SEND_RESULT_UNKNOWN',lease_until=NULL WHERE status='SENDING' AND lease_until<now()");
  for(let i=0;i<limit;i++) {
    const item=await db.transaction(async em=>{
      const [r]=await em.query("SELECT e.*,a.status AS assignment_status FROM mission_email e LEFT JOIN assignment a ON a.id=e.assignment_id WHERE e.status='PENDING' AND e.available_at<=now() AND (e.lease_until IS NULL OR e.lease_until<now()) ORDER BY e.created_at,e.id LIMIT 1 FOR UPDATE OF e SKIP LOCKED");
      if(!r)return null;
      const [allowed]=await em.query('SELECT 1 FROM account WHERE id=$1 AND active AND email=$2 AND ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM membership WHERE user_id=$1 AND organization_id=$3 AND active))',[r.user_id,r.recipient,r.organization_id]);
      let reminderAllowed=true;
      if(['REMINDER','START_REMINDER_24H','START_REMINDER_2H'].includes(r.kind)) {
        const [m]=await em.query('SELECT status,version,start_at,reminders_enabled FROM mission WHERE id=$1',[r.mission_id]);
        reminderAllowed=!!m && m.version===r.mission_version && new Date(r.expires_at).getTime()>Date.now() && !demoNoticeSuppressed(r.mission_id,r.kind);
        reminderAllowed &&= r.kind==='REMINDER' ? m.status==='OPEN' && m.reminders_enabled : m.status==='FILLED' && r.assignment_status==='ACTIVE';
      }
      if(!allowed || !reminderAllowed || (r.kind==='CONFIRMATION' && !['ACTIVE','COMPLETED'].includes(r.assignment_status))) {
        await em.query("UPDATE mission_email SET status='CANCELLED',last_error='RECIPIENT_OR_ASSIGNMENT_CHANGED',lease_until=NULL WHERE id=$1",[r.id]);
        return {skip:true};
      }
      r.token=randomUUID();
      r.payload.from ||= process.env.SMTP2GO_FROM;
      await em.query("UPDATE mission_email SET status='SENDING',attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,now()),lease_until=now()+interval '90 seconds',lease_token=$2,payload=$3 WHERE id=$1",[r.id,r.token,JSON.stringify(r.payload)]);
      return r;
    });
    if(!item)break;
    if(item.skip)continue;
    let failure='SEND_RESULT_UNKNOWN',permanent=false,retry=false,requested=false;
    try {
      const doc=item.document_id?await documents.read(item.user_id,item.document_id):null;
      const body={sender:item.payload.from,to:[item.recipient],subject:item.payload.subject,html_body:item.payload.html,text_body:item.payload.text,custom_headers:[{header:EMAIL_CORRELATION_HEADER,value:item.id}],attachments:doc?[{filename:(item.kind==='CONFIRMATION'?'confirmation':'annulation')+'-mission-'+item.assignment_id+'.pdf',fileblob:doc.data.toString('base64'),mimetype:'application/pdf'}]:[]};
      requested=true;
      const response=await transport('https://api.smtp2go.com/v3/email/send',{method:'POST',headers:{'X-Smtp2go-Api-Key':process.env.SMTP2GO_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
      if(!response.ok) {
        failure='SMTP2GO_HTTP_'+response.status;
        retry=response.status===429;
        permanent=response.status>=400 && response.status<500 && ![408,429].includes(response.status);
        throw new Error(failure);
      }
      const result=await response.json() as {data?:{email_id?:string;succeeded?:number;failed?:number}};
      if(result.data?.succeeded!==1 || result.data.failed!==0 || !result.data.email_id) {
        permanent=result.data?.succeeded===0;failure='SMTP2GO_RECEIPT_INVALID';throw new Error(failure);
      }
      await db.query("UPDATE mission_email SET status='SENT',provider_id=COALESCE(provider_id,$3),sent_at=COALESCE(sent_at,now()),accepted_at=COALESCE(accepted_at,now()),lease_until=NULL,last_error=NULL WHERE id=$1 AND lease_token=$2 AND status='SENDING'",[item.id,item.token,result.data.email_id]);
      sent++;
    } catch {
      await db.query("UPDATE mission_email SET status=$3,last_error=$4,lease_until=NULL,available_at=now()+interval '60 seconds'*power(2,LEAST(attempts,5)) WHERE id=$1 AND lease_token=$2 AND status='SENDING'",[item.id,item.token,permanent?'FAILED':((retry || !requested) && item.attempts<4)?'PENDING':'UNCERTAIN',failure]);
    }
  }
  return {configured:true,sent};
}
