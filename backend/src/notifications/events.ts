import { demoNoticeSuppressed } from "./demo-suppression";
import type { SqlClient } from "../database/database";
import { noticeMessage, NoticeKind } from "./catalog";

type Context = { missionId?: string; version?: number; applicationId?: string; needId?: string; detail?: string };
export async function notify(em: SqlClient, kind: NoticeKind, users: string[], organizations: string[] = [], context: Context = {}) {
  if (demoNoticeSuppressed(context.missionId, kind)) return;
  const [event] = await em.query("INSERT INTO outbox(event,payload,completed_at) VALUES('NotificationCreated',$1,now()) RETURNING id", [JSON.stringify({kind, ...context})]);
  const recipients = await em.query(`
    SELECT a.id AS user_id,NULL::uuid AS organization_id,
      CASE WHEN a.family='NURSE' THEN 'NURSE' ELSE COALESCE((SELECT o.kind FROM membership s JOIN organization o ON o.id=s.organization_id WHERE s.user_id=a.id AND s.active LIMIT 1),'AGENCY') END AS role
    FROM account a WHERE a.active AND a.id=ANY($1::uuid[])
    UNION ALL SELECT a.id,s.organization_id,o.kind FROM membership s JOIN account a ON a.id=s.user_id AND a.active JOIN organization o ON o.id=s.organization_id
    WHERE s.active AND s.organization_id=ANY($2::uuid[]) AND NOT a.id=ANY($1::uuid[])
  `, [users, organizations]);
  for (const recipient of recipients) {
    const href = context.missionId ? (recipient.role === "NURSE" ? "/missions/m_" : "/gestion/missions/") + context.missionId : context.needId ? "/besoins" : "/notifications";
    await em.query("INSERT INTO notification(user_id,event_id,kind,message,organization_id,href,context) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING", [recipient.user_id,event.id,kind,noticeMessage(kind,recipient.role,context.detail),recipient.organization_id,href,JSON.stringify(context)]);
  }
}

/** Called within the business transaction: a rollback also rolls back all notices. */
export async function notifyAudit(em: SqlClient, action: string, id: string | null, details: any = {}) {
  if (!id) return;
  if (action === "ACCOUNT_CREATED") return notify(em,"WELCOME",[id]);
  if (action === "RPPS_RESULT") return notify(em,"RPPS_RESULT",[id],[],{detail:details.status});
  if (["CLOSURE_REQUESTED","CLOSURE_CANCELLED","CLOSURE_APPROVED"].includes(action)) {
    const [r] = await em.query("SELECT account_id FROM closure_request WHERE id=$1",[id]);
    if (r) await notify(em,action as NoticeKind,[r.account_id]);
    return;
  }
  if (["STAFFING_REQUEST_CREATED","STAFFING_REQUEST_UPDATED"].includes(action)) {
    const rows = await em.query("SELECT establishment_id AS agency_id FROM staffing_request WHERE id=$1 UNION SELECT l.agency_id FROM staffing_request s JOIN agency_link l ON l.establishment_id=s.establishment_id WHERE s.id=$1",[id]);
    return notify(em,action === "STAFFING_REQUEST_CREATED" ? "NEED_CREATED" : "NEED_UPDATED",[],rows.map(r=>r.agency_id),{needId:id});
  }
  if (["APPLICATION_SUBMITTED","APPLICATION_REJECTED","APPLICATION_WITHDRAWN"].includes(action)) {
    const [a] = await em.query("SELECT a.*,m.version,m.agency_id,m.establishment_id FROM application a JOIN mission m ON m.id=a.mission_id WHERE a.id=$1",[id]);
    if (a) await notify(em,action as NoticeKind,[a.nurse_id],[a.agency_id,a.establishment_id],{missionId:a.mission_id,version:a.version,applicationId:id});
    return;
  }
  if (["MISSION_OPEN","MISSION_REVISED","MISSION_COMPLETED","ASSIGNMENT_CREATED"].includes(action)) {
    const missionId = action === "ASSIGNMENT_CREATED" ? details.missionId : id;
    const [m] = await em.query("SELECT * FROM mission WHERE id=$1",[missionId]);
    if (!m) return;
    const context = {missionId:m.id,version:m.version};
    if (action === "MISSION_OPEN") return notify(em,"MISSION_PUBLISHED",[],[m.establishment_id],context);
    if (action === "MISSION_REVISED" && m.status === "OPEN" && details.conditionsChanged) {
      const applicants = await em.query("SELECT nurse_id FROM application WHERE mission_id=$1 AND status IN('SUBMITTED','SELECTED') AND consent_version<>$2",[m.id,m.version]);
      return notify(em,"MISSION_CHANGED",applicants.map(r=>r.nurse_id),[m.agency_id,m.establishment_id],context);
    }
    if (action === "ASSIGNMENT_CREATED") {
      const applicants = await em.query("SELECT nurse_id FROM application WHERE mission_id=$1 AND status IN('SUBMITTED','SELECTED')",[m.id]);
      return notify(em,"MISSION_FILLED",applicants.map(r=>r.nurse_id),[],context);
    }
    if (action === "MISSION_COMPLETED") {
      const nurses = await em.query("SELECT nurse_id FROM assignment WHERE mission_id=$1 AND status='COMPLETED'",[m.id]);
      return notify(em,"MISSION_COMPLETED",nurses.map(r=>r.nurse_id),[m.agency_id,m.establishment_id],context);
    }
  }
}
