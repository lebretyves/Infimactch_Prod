import { Database } from '../database/database';
import { mutedDemoMissionIds } from '../notifications/demo-suppression';

// Database-wide budget: repeated n8n batches and concurrent workers share the same cap.
const batchSize = 25;
const hourlyBudget = 100;
export async function sendReminders(db: Database, notice: (em: any, eventId: string, recipient: any, kind: 'REMINDER', mission: any) => Promise<any[]>) {
  return db.transaction(async em => {
    await em.query('SELECT pg_advisory_xact_lock(1789826400,1)');
    const [usage] = await em.query("SELECT count(*)::int AS missions, COALESCE(sum(recipient_count),0)::int AS recipients FROM reminder_window WHERE created_at>now()-interval '1 hour'");
    let remaining = Math.max(0, hourlyBudget - usage.recipients);
    const limit=Math.min(batchSize,Math.max(0,hourlyBudget-usage.missions));
    if (!remaining || !limit) return {status:'PROCESSED',processed:0,notifications:0,hasMore:false,budgetLimited:true};
    const missions = await em.query(`SELECT * FROM mission
      WHERE reminders_enabled AND id<>ALL($1::uuid[]) AND status='OPEN' AND start_at>now()
        AND first_published_at<=now()-interval '24 hours' AND reminder_count<3
        AND (last_reminder_at IS NULL OR last_reminder_at<=now()-interval '24 hours')
      ORDER BY COALESCE(last_reminder_at,first_published_at),id LIMIT $2 FOR UPDATE SKIP LOCKED`, [mutedDemoMissionIds,limit]);
    let notifications=0, processed=0;
    for (const m of missions) {
      const members = await em.query(`SELECT a.id AS user_id,
        CASE WHEN EXISTS(SELECT 1 FROM membership s WHERE s.user_id=a.id AND s.organization_id=$1 AND s.active)
          THEN 'AGENCY' ELSE 'ESTABLISHMENT' END AS role
        FROM account a WHERE a.active AND EXISTS(SELECT 1 FROM membership s
          WHERE s.user_id=a.id AND s.organization_id IN($1,$2) AND s.active)
        ORDER BY a.id LIMIT $3 FOR SHARE OF a`, [m.agency_id,m.establishment_id,remaining+1]);
      // Never exceed the budget or mark a partially notified mission as delivered.
      if (members.length>remaining) continue;
      const [e] = await em.query("INSERT INTO outbox(event,payload,completed_at) VALUES('ReminderCreated',$1,now()) RETURNING id",[JSON.stringify({missionId:m.id,version:m.version})]);
      let sent=0;
      for (const actor of members) sent+=(await notice(em,e.id,actor,'REMINDER',m)).length;
      await em.query("INSERT INTO reminder_window(mission_id,version,window_key,event_id,recipient_count) VALUES($1,$2,$3,$4,$5)",[m.id,m.version,'reminder-'+(m.reminder_count+1),e.id,sent]);
      await em.query("UPDATE mission SET reminder_count=reminder_count+1,last_reminder_at=now() WHERE id=$1",[m.id]);
      await em.query("INSERT INTO workflow_receipt(event_id,action) VALUES($1,'reminder')",[e.id]);
      notifications+=sent;remaining-=sent;processed++;
    }
    return {status:'PROCESSED',processed,notifications,hasMore:missions.length===limit && processed===missions.length && remaining>0 && usage.missions+processed<hourlyBudget,budgetLimited:remaining===0 || processed<missions.length};
  });
}
