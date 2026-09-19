import type { Database, SqlClient } from '../database/database';
import { mutedDemoMissionIds } from './demo-suppression';

const kinds = ['MATCH', 'REMINDER', 'MISSION_PUBLISHED'];
const noticeScope = `n.kind=ANY($2::text[]) AND COALESCE(n.context->>'missionId',e.payload->>'missionId')=ANY($1::text[])`;
const deletableNotice = `${noticeScope} AND NOT EXISTS(SELECT 1 FROM notification_delivery d WHERE d.notification_id=n.id AND (d.status IN('SENDING','UNCERTAIN') OR NOT d.kind=ANY($2::text[])))`;
const pendingEvent = `event IN('MissionOPEN','MatchRequested') AND payload->>'missionId'=ANY($1::text[]) AND completed_at IS NULL AND (lease_until IS NULL OR lease_until<now())`;
const legacyScope = `mission_id=ANY($1::uuid[]) AND kind=ANY($2::text[]) AND status IN('PENDING','FAILED','CANCELLED','SENT')`;
async function inventory(em: SqlClient) {
  const [r] = await em.query(`SELECT
    (SELECT count(*)::int FROM notification n LEFT JOIN outbox e ON e.id=n.event_id WHERE ${noticeScope}) AS alerts,
    (SELECT count(*)::int FROM notification n LEFT JOIN outbox e ON e.id=n.event_id WHERE ${deletableNotice}) AS deletable_alerts,
    (SELECT count(*)::int FROM discord_delivery WHERE ${legacyScope}) AS legacy_deliveries,
    (SELECT count(*)::int FROM outbox WHERE ${pendingEvent}) AS pending_events`, [mutedDemoMissionIds, kinds]);
  return r;
}

/** Operator-only maintenance. No HTTP endpoint; bounded transaction, no business data deletion. */
export async function purgeDemoAlerts(db: Pick<Database, 'transaction'>, apply = false) {
  return db.transaction(async em => {
    await em.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s'");
    const before = await inventory(em);
    if (!apply) return { mode: 'PREVIEW', before, after: before, deletedAlerts: 0, deletedDeliveries: 0, deletedLegacyDeliveries: 0, completedEvents: 0, hasMore: before.deletable_alerts + before.legacy_deliveries + before.pending_events > 0 };
    await em.query("SELECT pg_advisory_xact_lock(hashtextextended('infimatch-purge-legacy-demo-alerts-v1',0))");
    const candidates = await em.query(`SELECT n.id FROM notification n LEFT JOIN outbox e ON e.id=n.event_id WHERE ${deletableNotice} ORDER BY n.id LIMIT 500 FOR UPDATE OF n SKIP LOCKED`, [mutedDemoMissionIds, kinds]);
    const ids = candidates.map(r => r.id);
    // Lock delivery rows and recheck: a worker may have started sending since selection.
    const deliveries = await em.query('SELECT id,notification_id,status,kind FROM notification_delivery WHERE notification_id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [ids]);
    const protectedIds = new Set(deliveries.filter(d => ['SENDING','UNCERTAIN'].includes(d.status) || !kinds.includes(d.kind)).map(d => d.notification_id));
    const safeIds = ids.filter(id => !protectedIds.has(id));
    const deleted = await em.query('DELETE FROM notification WHERE id=ANY($1::uuid[]) RETURNING id', [safeIds]);
    const removedIds = new Set(deleted.map(r => r.id));
    const legacy = await em.query(`WITH target AS (SELECT id FROM discord_delivery WHERE ${legacyScope} ORDER BY id LIMIT 500 FOR UPDATE SKIP LOCKED) DELETE FROM discord_delivery d USING target t WHERE d.id=t.id RETURNING d.id`, [mutedDemoMissionIds, kinds]);
    const events = await em.query(`WITH target AS (SELECT id FROM outbox WHERE ${pendingEvent} ORDER BY id LIMIT 500 FOR UPDATE SKIP LOCKED) UPDATE outbox e SET completed_at=now(),lease_until=NULL,lease_token=NULL,last_error='LEGACY_DEMO_NOTIFICATIONS_DISABLED' FROM target t WHERE e.id=t.id RETURNING e.id`, [mutedDemoMissionIds]);
    await em.query("INSERT INTO workflow_receipt(event_id,action) SELECT unnest($1::uuid[]),'matches' ON CONFLICT DO NOTHING", [events.map(r => r.id)]);
    const after = await inventory(em);
    const result = { mode:'APPLIED', before, after, deletedAlerts:deleted.length, deletedDeliveries:deliveries.filter(d => removedIds.has(d.notification_id)).length, deletedLegacyDeliveries:legacy.length, completedEvents:events.length, hasMore:after.deletable_alerts + after.legacy_deliveries + after.pending_events > 0 };
    if (deleted.length + legacy.length + events.length) await em.query("INSERT INTO audit(actor_id,event,details) VALUES(NULL,'LEGACY_DEMO_ALERTS_PURGED',$1)", [JSON.stringify(result)]);
    return result;
  });
}
