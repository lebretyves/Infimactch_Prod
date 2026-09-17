import { MigrationInterface, QueryRunner } from "typeorm";
export class NotificationCenter1789381400000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      ALTER TABLE notification ADD COLUMN organization_id uuid REFERENCES organization(id) ON DELETE CASCADE;
      ALTER TABLE notification ADD COLUMN href text NOT NULL DEFAULT '/notifications';
      ALTER TABLE notification ADD COLUMN context jsonb NOT NULL DEFAULT '{}';
      ALTER TABLE notification DROP CONSTRAINT notification_user_id_event_id_kind_key;
      CREATE UNIQUE INDEX notification_scoped_event ON notification(user_id,event_id,kind,COALESCE(organization_id,'00000000-0000-0000-0000-000000000000'::uuid));
      CREATE UNIQUE INDEX discord_destination_channel_unique ON discord_destination(target_id) WHERE target_type='channel';
      CREATE UNIQUE INDEX discord_link_unique_user ON discord_link(discord_user_id);
      CREATE TABLE discord_challenge (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
        discord_user_id text NOT NULL, code_hash text NOT NULL, attempts integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, verified_at timestamptz
      );
      CREATE INDEX discord_challenge_account ON discord_challenge(account_id,created_at);
      CREATE TABLE notification_preference (
        account_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
        kind text NOT NULL, discord boolean NOT NULL DEFAULT true,
        PRIMARY KEY(account_id,kind)
      );
      -- Replace the four-kind limit without changing the original migration.
      DO $$ DECLARE c record; BEGIN
        FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='discord_destination'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%events%' LOOP
          EXECUTE format('ALTER TABLE discord_destination DROP CONSTRAINT %I', c.conname);
        END LOOP;
      END $$;
      CREATE TABLE notification_delivery (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id uuid NOT NULL REFERENCES notification(id) ON DELETE CASCADE,
        destination_id uuid NOT NULL REFERENCES discord_destination(id) ON DELETE CASCADE,
        destination_version integer NOT NULL,
        event_id uuid REFERENCES outbox(id) ON DELETE CASCADE,
        kind text NOT NULL,
        status text NOT NULL DEFAULT 'PENDING' CHECK(status IN('PENDING','SENDING','SENT','FAILED','CANCELLED','UNCERTAIN')),
        attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
        lease_token uuid, lease_until timestamptz, last_error text, message_id text,
        created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz,
        UNIQUE(destination_id,event_id,kind)
      );
      CREATE INDEX notification_delivery_pending ON notification_delivery(available_at) WHERE status='PENDING';
      CREATE FUNCTION queue_notification_delivery() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO notification_delivery(notification_id,destination_id,destination_version,event_id,kind)
        SELECT NEW.id,d.id,d.version,NEW.event_id,NEW.kind FROM discord_destination d
        WHERE d.enabled AND NEW.kind=ANY(d.events)
          AND ((NEW.organization_id IS NULL AND d.user_id=NEW.user_id) OR d.organization_id=NEW.organization_id)
          AND (d.organization_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM notification_preference p WHERE p.account_id=NEW.user_id AND p.kind=NEW.kind AND NOT p.discord))
        ON CONFLICT DO NOTHING;
        RETURN NEW;
      END $$;
      CREATE TRIGGER notification_delivery_insert AFTER INSERT ON notification FOR EACH ROW EXECUTE FUNCTION queue_notification_delivery();
    `);
  }
  async down() { throw new Error("Restore a verified backup instead of destructive rollback"); }
}
