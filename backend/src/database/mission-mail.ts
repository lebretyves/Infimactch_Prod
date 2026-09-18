import {MigrationInterface, QueryRunner} from 'typeorm';
export class MissionMail1789722000000 implements MigrationInterface {
  async up(q:QueryRunner) { await q.query(`
    ALTER TABLE document DROP CONSTRAINT document_kind_check;
    ALTER TABLE document ADD CONSTRAINT document_kind_check CHECK(kind IN('EVIDENCE','CONFIRMATION','BANK','CANCELLATION'));
    CREATE TABLE mission_cancellation (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assignment_id uuid NOT NULL UNIQUE REFERENCES assignment(id) ON DELETE CASCADE,
      details jsonb NOT NULL, status text NOT NULL DEFAULT 'PENDING' CHECK(status IN('PENDING','READY','FAILED')),
      document_id uuid REFERENCES document(id) ON DELETE CASCADE, attempts integer NOT NULL DEFAULT 0,
      available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE mission_email (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assignment_id uuid NOT NULL REFERENCES assignment(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE, organization_id uuid REFERENCES organization(id) ON DELETE CASCADE,
      kind text NOT NULL CHECK(kind IN('CONFIRMATION','CANCELLATION')), document_id uuid NOT NULL REFERENCES document(id) ON DELETE CASCADE,
      recipient text NOT NULL, payload jsonb NOT NULL,
      status text NOT NULL DEFAULT 'PENDING' CHECK(status IN('PENDING','SENDING','SENT','FAILED','CANCELLED','UNCERTAIN')),
      attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
      lease_until timestamptz, lease_token uuid, first_attempt_at timestamptz,
      provider_id text, last_error text, sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(assignment_id,user_id,kind)
    );
    CREATE INDEX mission_email_pending ON mission_email(available_at) WHERE status IN('PENDING','SENDING');
  `); }
  async down() {throw new Error('Restore a verified backup instead of destructive rollback');}
}
