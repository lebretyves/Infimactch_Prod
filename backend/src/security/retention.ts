import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { audit, type Database, type SqlClient } from "../database/database";
import { projectRoot } from "../config";

/** V1 demonstration policy. Missions, assignments and current evidence are kept. */
export const retentionPolicy = {
  idempotencyDays: 1,
  notificationsDays: 90,
  auditDays: 365,
  stagingDocumentHours: 24,
  supersededBankDays: 30,
  completedOutboxDays: 30,
  matchingExplanationDays: 30,
  backupDays: 30,
  businessHistoryDays: 365,
} as const;

export type RetentionSummary = {
  dryRun: boolean;
  sessions: number;
  idempotency: number;
  notifications: number;
  audit: number;
  stagingDocuments: number;
  supersededBankDocuments: number;
  completedOutbox: number;
  documentIds?: string[];
  businessMissions?: number;
};

function documentDirectory() {
  return process.env.DOCUMENT_DIRECTORY || resolve(projectRoot, "data/documents");
}

/** Run only after the SQL transaction has committed. A failed cleanup is retryable. */
export async function cleanupRemovedDocuments(db: Database, ids: string[]) {
  for (const id of new Set(ids)) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid document id");
    await db.transaction(async em => {
      await em.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ["document-file:" + id]);
      if ((await em.query("SELECT id FROM document WHERE id=$1", [id])).length) return;
      await rm(resolve(documentDirectory(), id + ".bin"), {force:true});
      await rm(resolve(documentDirectory(), id + ".tmp"), {force:true});
    });
  }
}

async function count(em: SqlClient, sql: string, parameters: unknown[] = []) {
  const [row] = await em.query(sql, parameters);
  return Number(row?.n ?? 0);
}

export async function inspectRetention(
  em: SqlClient,
): Promise<Omit<RetentionSummary, "dryRun">> {
  const sessions = await count(
    em,
    "SELECT count(*)::int AS n FROM session WHERE expire<now()",
  );
  const idempotency = await count(
    em,
    "SELECT count(*)::int AS n FROM idempotency WHERE created_at<now()-make_interval(days=>$1)",
    [retentionPolicy.idempotencyDays],
  );
  const notifications = await count(
    em,
    "SELECT count(*)::int AS n FROM notification WHERE created_at<now()-make_interval(days=>$1)",
    [retentionPolicy.notificationsDays],
  );
  const auditRows = await count(
    em,
    "SELECT count(*)::int AS n FROM audit WHERE created_at<now()-make_interval(days=>$1)",
    [retentionPolicy.auditDays],
  );
  const stagingDocuments = await count(
    em,
    "SELECT count(*)::int AS n FROM document WHERE status='STAGING' AND kind<>'CONFIRMATION' AND created_at<now()-make_interval(hours=>$1)",
    [retentionPolicy.stagingDocumentHours],
  );
  const supersededBankDocuments = await count(
    em,
    "SELECT count(*)::int AS n FROM document WHERE kind='BANK' AND superseded_at IS NOT NULL AND superseded_at<now()-make_interval(days=>$1)",
    [retentionPolicy.supersededBankDays],
  );
  const completedOutbox = await count(
    em,
    "SELECT count(*)::int AS n FROM outbox WHERE completed_at IS NOT NULL AND completed_at<now()-make_interval(days=>$1) AND NOT EXISTS(SELECT 1 FROM reminder_window w WHERE w.event_id=outbox.id)",
    [retentionPolicy.completedOutboxDays],
  );
  return {
    sessions,
    idempotency,
    notifications,
    audit: auditRows,
    stagingDocuments,
    supersededBankDocuments,
    completedOutbox,
    businessMissions: await count(em,"SELECT count(*)::int AS n FROM mission m WHERE status IN('COMPLETED','CANCELLED') AND end_at<now()-make_interval(days=>$1) AND NOT EXISTS(SELECT 1 FROM assignment a WHERE a.mission_id=m.id AND a.status='ACTIVE')",[retentionPolicy.businessHistoryDays]),
  };
}

export async function applyRetention(em: SqlClient): Promise<RetentionSummary> {
  const before = await inspectRetention(em);
  const staging = await em.query(
    "SELECT id FROM document WHERE status='STAGING' AND kind<>'CONFIRMATION' AND created_at<now()-make_interval(hours=>$1) FOR UPDATE",
    [retentionPolicy.stagingDocumentHours],
  );
  const banks = await em.query(
    "SELECT id FROM document WHERE kind='BANK' AND superseded_at IS NOT NULL AND superseded_at<now()-make_interval(days=>$1) FOR UPDATE",
    [retentionPolicy.supersededBankDays],
  );
  const expiredOutbox = await em.query(
    "SELECT id FROM outbox WHERE completed_at IS NOT NULL AND completed_at<now()-make_interval(days=>$1) AND NOT EXISTS(SELECT 1 FROM reminder_window w WHERE w.event_id=outbox.id)",
    [retentionPolicy.completedOutboxDays],
  );
  await em.query("DELETE FROM session WHERE expire<now()");
  await em.query(
    "DELETE FROM idempotency WHERE created_at<now()-make_interval(days=>$1)",
    [retentionPolicy.idempotencyDays],
  );
  await em.query(
    "DELETE FROM notification WHERE created_at<now()-make_interval(days=>$1)",
    [retentionPolicy.notificationsDays],
  );
  await em.query(
    "DELETE FROM audit WHERE created_at<now()-make_interval(days=>$1)",
    [retentionPolicy.auditDays],
  );
  if (expiredOutbox.length) {
    const ids = expiredOutbox.map((row: { id: string }) => row.id);
    await em.query("DELETE FROM workflow_receipt WHERE event_id=ANY($1::uuid[])", [
      ids,
    ]);
    await em.query(
      "UPDATE notification SET event_id=NULL WHERE event_id=ANY($1::uuid[])",
      [ids],
    );
    await em.query("DELETE FROM outbox WHERE id=ANY($1::uuid[])", [ids]);
  }
  // POC fictional history only: preserve open missions and every active assignment.
  const history=await em.query("SELECT id FROM mission m WHERE status IN('COMPLETED','CANCELLED') AND end_at<now()-make_interval(days=>$1) AND NOT EXISTS(SELECT 1 FROM assignment a WHERE a.mission_id=m.id AND a.status='ACTIVE') FOR UPDATE",[retentionPolicy.businessHistoryDays]);
  const missionIds=history.map((row:{id:string})=>row.id);
  const historicalDocuments=missionIds.length?await em.query("SELECT d.id FROM document d JOIN assignment a ON a.id=d.assignment_id WHERE a.mission_id=ANY($1::uuid[])",[missionIds]):[];
  if(missionIds.length){
    await em.query("DELETE FROM mission_confirmation WHERE assignment_id IN(SELECT id FROM assignment WHERE mission_id=ANY($1::uuid[]))",[missionIds]);
  }
  const documentIds = [...staging, ...banks,...historicalDocuments].map((row: { id: string }) => row.id);
  if (documentIds.length)
    await em.query("DELETE FROM document WHERE id=ANY($1::uuid[])", [
      documentIds,
    ]);
  if(missionIds.length){
    await em.query("DELETE FROM assignment WHERE mission_id=ANY($1::uuid[])",[missionIds]);
    await em.query("DELETE FROM application WHERE mission_id=ANY($1::uuid[])",[missionIds]);
    await em.query("DELETE FROM reminder_window WHERE mission_id=ANY($1::uuid[])",[missionIds]);
    await em.query("DELETE FROM favorite WHERE kind='MISSION' AND target_id=ANY($1::uuid[])",[missionIds]);
    await em.query("DELETE FROM mission WHERE id=ANY($1::uuid[])",[missionIds]);
  }
  // Physical files remain intact until the caller commits successfully.
  await audit(em, null, "RETENTION_PURGED", null, before);
  return { dryRun: false, ...before, documentIds, businessMissions:missionIds.length };
}

export async function anonymizeAccount(em: SqlClient, accountId: string) {
  const [account] = await em.query(
    "SELECT id FROM account WHERE id=$1::uuid FOR UPDATE",
    [accountId],
  );
  if (!account) throw new Error("Account not found");
  const documents = await em.query(
    "SELECT id FROM document WHERE owner_id=$1 AND kind IN('EVIDENCE','BANK')",
    [accountId],
  );
  await em.query("DELETE FROM session WHERE sess->>'userId'=$1", [accountId]);
  await em.query("DELETE FROM google_identity WHERE account_id=$1", [accountId]);
  await em.query("UPDATE membership SET active=false WHERE user_id=$1", [accountId]);
  await em.query("DELETE FROM favorite WHERE user_id=$1", [accountId]);
  await em.query("DELETE FROM profile_qualification WHERE nurse_id=$1", [accountId]);
  await em.query("DELETE FROM notification WHERE user_id=$1", [accountId]);
  await em.query("DELETE FROM idempotency WHERE actor_id=$1", [accountId]);
  await em.query("UPDATE audit SET actor_id=NULL,details='{}'::jsonb WHERE actor_id=$1 OR resource_id=$1", [accountId]);
  const ids = documents.map((row: { id: string }) => row.id);
  if (ids.length)
    await em.query("DELETE FROM document WHERE id=ANY($1::uuid[])", [ids]);
  await em.query(
    "UPDATE profile SET display_name='Compte clôturé',rpps_number=NULL,rpps_status='NOT_CHECKED',latitude=NULL,longitude=NULL,visible=false,notifications_enabled=false,qualifications='{}',skills='{}',experience='[]'::jsonb,available='[]'::jsonb,unavailable='[]'::jsonb,radius_km=NULL,accepted_shifts='{}',preferred_shifts='{}',rpps_version=rpps_version+1,rpps_checked_at=NULL,details='{}'::jsonb,updated_at=now() WHERE user_id=$1",
    [accountId],
  );
  await em.query(
    "UPDATE account SET email=$2,password_hash='disabled',active=false,session_version=session_version+1 WHERE id=$1",
    [accountId, "closed." + accountId + "@anonymized.invalid"],
  );

  await audit(em, null, "ACCOUNT_ANONYMIZED", accountId, {
    documents: ids.length,
  });
  return { id: accountId, documents: ids.length, documentIds: ids };
}
