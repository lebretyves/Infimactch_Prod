import { MigrationInterface, QueryRunner } from 'typeorm';

export class MissionGuardrails1789826400000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      ALTER TABLE application DROP CONSTRAINT application_status_check;
      ALTER TABLE application ADD CONSTRAINT application_status_check
        CHECK(status IN('SUBMITTED','SELECTED','REJECTED','WITHDRAWN','ACCEPTED','UNAVAILABLE'));
      ALTER TABLE application ADD COLUMN closure_reason text;
      ALTER TABLE application ADD COLUMN closed_at timestamptz;

      -- All existing missions, including drafts, are permanently excluded from reminders.
      -- Changing the default afterwards only opts in missions created after this migration.
      ALTER TABLE mission ADD COLUMN reminders_enabled boolean NOT NULL DEFAULT false;
      ALTER TABLE mission ALTER COLUMN reminders_enabled SET DEFAULT true;
      ALTER TABLE mission ADD COLUMN first_published_at timestamptz;
      ALTER TABLE mission ADD COLUMN reminder_count integer NOT NULL DEFAULT 0 CHECK(reminder_count BETWEEN 0 AND 3);
      ALTER TABLE mission ADD COLUMN last_reminder_at timestamptz;
      CREATE FUNCTION stamp_mission_publication() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.status='OPEN' AND NEW.first_published_at IS NULL THEN
          NEW.first_published_at=now();
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER mission_publication_clock BEFORE INSERT OR UPDATE OF status ON mission
        FOR EACH ROW EXECUTE FUNCTION stamp_mission_publication();
      ALTER TABLE reminder_window ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
      ALTER TABLE reminder_window ADD COLUMN recipient_count integer NOT NULL DEFAULT 0;
      CREATE INDEX reminder_window_recent ON reminder_window(created_at);
      CREATE INDEX mission_reminders_due ON mission(first_published_at,last_reminder_at)
        WHERE reminders_enabled AND status='OPEN' AND reminder_count<3;
    `);
  }
  async down(): Promise<void> {
    throw new Error('Restore a verified backup instead of destructive rollback');
  }
}
