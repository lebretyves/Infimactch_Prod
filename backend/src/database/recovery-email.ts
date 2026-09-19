import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecoveryEmail1789840800000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE recovery_request
      ADD COLUMN email_status text NOT NULL DEFAULT 'NOT_REQUESTED'
        CHECK(email_status IN('NOT_REQUESTED','SENDING','ACCEPTED','FAILED','UNCERTAIN')),
      ADD COLUMN email_provider_id text,
      ADD COLUMN email_last_error text;
    `);
  }
  async down() { throw Error('Restore a verified backup'); }
}
