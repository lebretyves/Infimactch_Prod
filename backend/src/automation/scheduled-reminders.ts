import {Database,SqlClient} from '../database/database';
import {mutedDemoMissionIds} from '../notifications/demo-suppression';
export type ReminderKind='REMINDER'|'START_REMINDER_24H'|'START_REMINDER_2H';
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function reminderContent(kind:ReminderKind,m:any,href:string){
 const heading=kind==='REMINDER'?'Mission à pourvoir':kind==='START_REMINDER_24H'?'Votre mission approche — rappel J-1':'Votre mission approche — rappel H-2';
 const start=new Intl.DateTimeFormat('fr-FR',{timeZone:m.timezone||'Europe/Paris',dateStyle:'full',timeStyle:'short'}).format(new Date(m.start_at));
 const message=kind==='REMINDER'?'Cette mission est toujours ouverte. Consultez les candidatures et le suivi du recrutement.':'Une affectation est confirmée pour cette mission. Vérifiez les horaires, le lieu et les consignes dans InfiMatch.';
 const text=heading+'\n'+m.title+'\nDébut : '+start+' ('+(m.timezone||'Europe/Paris')+')\n\n'+message+'\n\nConsulter : '+href;
 return {subject:heading+' — '+m.title,text,html:`<!doctype html><html lang="fr"><body style="font-family:Arial;color:#102d48;background:#f0f6fc;padding:24px"><main style="max-width:600px;margin:auto;background:white;padding:28px;border-top:6px solid #1466e0"><strong>InfiMatch</strong><h1>${escapeHtml(heading)}</h1><h2>${escapeHtml(m.title)}</h2><p>Début : ${escapeHtml(start)} (${escapeHtml(m.timezone||'Europe/Paris')})</p><p>${escapeHtml(message)}</p><p><a href="${escapeHtml(href)}">Consulter la mission</a></p></main></body></html>`};
}
export async function queueReminderEmail(em:SqlClient,eventId:string,actor:any,kind:ReminderKind,m:any,assignmentId:string|null=null){
 const [account]=await em.query('SELECT email FROM account WHERE id=$1 AND active',[actor.user_id]);
 if(!account)return;
 const org=actor.role==='NURSE'?null:actor.role==='AGENCY'?m.agency_id:m.establishment_id;
 const origin=process.env.NOTIFICATION_APP_ORIGIN||process.env.APP_ORIGIN;
 if(!origin)throw new Error('APP_ORIGIN_REQUIRED');
 const href=new URL((actor.role==='NURSE'?'/missions/m_':'/gestion/missions/')+m.id,origin).href;
 const expires=kind==='START_REMINDER_24H'?new Date(new Date(m.start_at).getTime()-2*3600000):new Date(m.start_at);
 await em.query(`INSERT INTO mission_email(assignment_id,user_id,organization_id,kind,recipient,payload,mission_id,mission_version,event_id,expires_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,[assignmentId,actor.user_id,org,kind,account.email,JSON.stringify(reminderContent(kind,m,href)),m.id,m.version,eventId,expires]);
}
export async function scheduledReminders(db:Database){
 return db.transaction(async em=>{
 await em.query('SELECT pg_advisory_xact_lock(1790208000,1)');
 const rows=await em.query(`SELECT m.*,a.id AS assignment_id,a.nurse_id,
 CASE WHEN a.start_at>now()+interval '2 hours' THEN 'START_REMINDER_24H' ELSE 'START_REMINDER_2H' END AS reminder_kind
 FROM assignment a JOIN mission m ON m.id=a.mission_id
 WHERE a.status='ACTIVE' AND m.status='FILLED' AND m.schedule_precision='EXACT' AND m.id<>ALL($1::uuid[])
 AND a.start_at>now() AND a.start_at<=now()+interval '24 hours'
 AND NOT EXISTS(SELECT 1 FROM assignment_reminder r WHERE r.assignment_id=a.id AND r.kind=CASE WHEN a.start_at>now()+interval '2 hours' THEN 'START_REMINDER_24H' ELSE 'START_REMINDER_2H' END)
 ORDER BY a.start_at,a.id LIMIT 25 FOR UPDATE OF a,m SKIP LOCKED`,[mutedDemoMissionIds]);
 let notifications=0;
 for(const m of rows){
 const recipients=await em.query(`SELECT a.id AS user_id,CASE WHEN a.id=$3 THEN 'NURSE' WHEN EXISTS(SELECT 1 FROM membership x WHERE x.user_id=a.id AND x.organization_id=$1 AND x.active) THEN 'AGENCY' ELSE 'ESTABLISHMENT' END AS role
 FROM account a WHERE a.active AND (a.id=$3 OR EXISTS(SELECT 1 FROM membership x WHERE x.user_id=a.id AND x.organization_id IN($1,$2) AND x.active)) ORDER BY a.id`,[m.agency_id,m.establishment_id,m.nurse_id]);
 const [event]=await em.query("INSERT INTO outbox(event,payload,completed_at) VALUES('AssignmentReminderCreated',$1,now()) RETURNING id",[JSON.stringify({missionId:m.id,assignmentId:m.assignment_id,kind:m.reminder_kind})]);
 for(const actor of recipients){
 const org=actor.role==='NURSE'?null:actor.role==='AGENCY'?m.agency_id:m.establishment_id;
 const href=(actor.role==='NURSE'?'/missions/m_':'/gestion/missions/')+m.id;
 const context={missionId:m.id,version:m.version,assignmentId:m.assignment_id,expiresAt:m.reminder_kind==='START_REMINDER_24H'?new Date(new Date(m.start_at).getTime()-7200000):m.start_at};
 const message=actor.role==='NURSE'?'Votre affectation est confirmée. Consultez les horaires, le lieu et les consignes avant votre prise de poste.':'Une mission confirmée de votre organisation approche. Vérifiez le suivi et les consignes de prise de poste.';
 await em.query('INSERT INTO notification(user_id,event_id,kind,message,organization_id,href,context) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',[actor.user_id,event.id,m.reminder_kind,message,org,href,JSON.stringify(context)]);
 await queueReminderEmail(em,event.id,actor,m.reminder_kind,m,m.assignment_id);notifications++;
 }
 await em.query('INSERT INTO assignment_reminder(assignment_id,kind,event_id) VALUES($1,$2,$3)',[m.assignment_id,m.reminder_kind,event.id]);
 }
 return {status:'PROCESSED',processed:rows.length,notifications,hasMore:rows.length===25};
 });
}
