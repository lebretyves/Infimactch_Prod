import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClientRequests1789382000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE recovery_request (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id uuid NOT NULL REFERENCES account(id),
        status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN('REQUESTED','ISSUED','COMPLETED','REJECTED')),
        requested_at timestamptz NOT NULL DEFAULT now(),
        issued_at timestamptz, expires_at timestamptz, completed_at timestamptz,
        token_hash text UNIQUE, account_version integer,
        issued_by uuid REFERENCES account(id), decision_reason text
      );
      CREATE UNIQUE INDEX recovery_request_pending ON recovery_request(account_id) WHERE status IN('REQUESTED','ISSUED');
      CREATE INDEX recovery_request_date ON recovery_request(requested_at DESC);
      ALTER TABLE closure_request DROP CONSTRAINT closure_request_status_check;
      ALTER TABLE closure_request ADD CONSTRAINT closure_request_status_check CHECK(status IN('REQUESTED','APPROVED','PROCESSING','COMPLETED','CANCELLED','REJECTED'));
      ALTER TABLE closure_request ADD COLUMN decision_reason text, ADD COLUMN reviewed_by uuid REFERENCES account(id), ADD COLUMN last_error text;
      DROP INDEX closure_request_pending;
      CREATE UNIQUE INDEX closure_request_pending ON closure_request(account_id) WHERE status IN('REQUESTED','APPROVED','PROCESSING');
    `);
  }
  async down() { throw Error('Restore a verified backup'); }
}
