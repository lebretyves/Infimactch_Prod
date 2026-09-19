import {MigrationInterface, QueryRunner} from 'typeorm';

export class EmailDelivery1789844400000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      ALTER TABLE mission_email ADD COLUMN delivery_status text NOT NULL DEFAULT 'NOT_REPORTED'
        CHECK(delivery_status IN('NOT_REPORTED','PROCESSED','DELIVERED','BOUNCED','REJECTED','SPAM'));
      ALTER TABLE mission_email ADD COLUMN delivery_event_at timestamptz,
        ADD COLUMN accepted_at timestamptz, ADD COLUMN processed_at timestamptz,
        ADD COLUMN delivered_at timestamptz, ADD COLUMN bounced_at timestamptz,
        ADD COLUMN rejected_at timestamptz, ADD COLUMN spam_at timestamptz;
      UPDATE mission_email SET accepted_at=sent_at WHERE status='SENT';
      CREATE INDEX mission_email_provider ON mission_email(provider_id) WHERE provider_id IS NOT NULL;
      CREATE INDEX mission_email_user_created ON mission_email(user_id,created_at DESC,id);
      CREATE TABLE mission_email_delivery_event (
        fingerprint text PRIMARY KEY CHECK(length(fingerprint)=64),
        email_id uuid NOT NULL REFERENCES mission_email(id) ON DELETE CASCADE,
        event text NOT NULL CHECK(event IN('processed','delivered','bounce','reject','spam')),
        happened_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
        bounce_type text CHECK(bounce_type IN('hard','soft'))
      );
      CREATE INDEX mission_email_delivery_event_email ON mission_email_delivery_event(email_id,happened_at DESC);
    `);
  }
  async down() { throw new Error('Restore a verified backup instead of destructive rollback'); }
}
