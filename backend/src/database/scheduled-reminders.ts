import { MigrationInterface, QueryRunner } from "typeorm";
export class ScheduledReminders1790208000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
 ALTER TABLE mission_email ALTER COLUMN assignment_id DROP NOT NULL;
 ALTER TABLE mission_email ALTER COLUMN document_id DROP NOT NULL;
 ALTER TABLE mission_email DROP CONSTRAINT mission_email_kind_check;
 ALTER TABLE mission_email ADD CONSTRAINT mission_email_kind_check CHECK(kind IN('CONFIRMATION','CANCELLATION','REMINDER','START_REMINDER_24H','START_REMINDER_2H'));
 ALTER TABLE mission_email ADD COLUMN mission_id uuid REFERENCES mission(id) ON DELETE CASCADE,
 ADD COLUMN mission_version integer, ADD COLUMN event_id uuid REFERENCES outbox(id) ON DELETE CASCADE,
 ADD COLUMN expires_at timestamptz;
 ALTER TABLE mission_email ADD CONSTRAINT mission_email_shape CHECK(
 (kind IN('CONFIRMATION','CANCELLATION') AND assignment_id IS NOT NULL AND document_id IS NOT NULL) OR
 (kind='REMINDER' AND mission_id IS NOT NULL AND mission_version IS NOT NULL AND event_id IS NOT NULL AND expires_at IS NOT NULL) OR
 (kind IN('START_REMINDER_24H','START_REMINDER_2H') AND assignment_id IS NOT NULL AND mission_id IS NOT NULL AND mission_version IS NOT NULL AND event_id IS NOT NULL AND expires_at IS NOT NULL));
 CREATE UNIQUE INDEX mission_email_reminder_event ON mission_email(event_id,user_id,kind) WHERE event_id IS NOT NULL;
 CREATE TABLE assignment_reminder (
 assignment_id uuid REFERENCES assignment(id) ON DELETE CASCADE,
 kind text CHECK(kind IN('START_REMINDER_24H','START_REMINDER_2H')),
 event_id uuid NOT NULL REFERENCES outbox(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(assignment_id,kind));
 CREATE OR REPLACE FUNCTION queue_notification_delivery() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN
 INSERT INTO notification_delivery(notification_id,destination_id,destination_version,event_id,kind)
 SELECT NEW.id,d.id,d.version,NEW.event_id,NEW.kind FROM discord_destination d
 WHERE d.enabled AND NEW.kind=ANY(d.events)
 AND ((NEW.organization_id IS NULL AND d.user_id=NEW.user_id) OR d.organization_id=NEW.organization_id
 OR (NEW.kind IN('REMINDER','START_REMINDER_24H','START_REMINDER_2H') AND d.user_id=NEW.user_id
 AND EXISTS(SELECT 1 FROM membership m WHERE m.user_id=NEW.user_id AND m.organization_id=NEW.organization_id AND m.active)
 AND NOT EXISTS(SELECT 1 FROM discord_destination o WHERE o.organization_id=NEW.organization_id AND o.enabled AND NEW.kind=ANY(o.events))))
 AND (d.organization_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM notification_preference p WHERE p.account_id=NEW.user_id AND p.kind=NEW.kind AND NOT p.discord))
 ON CONFLICT DO NOTHING;
 RETURN NEW;
 END $$;
 `);
  }
  async down() {
    throw new Error(
      "Restore a verified backup instead of destructive rollback",
    );
  }
}
