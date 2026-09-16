import { MigrationInterface, QueryRunner } from "typeorm";

export class AccountSecurity1789380800000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
 ALTER TABLE account ADD COLUMN active boolean NOT NULL DEFAULT true;
 ALTER TABLE account ADD COLUMN session_version integer NOT NULL DEFAULT 1
   CHECK(session_version > 0);
 CREATE INDEX account_active_idx ON account(id) WHERE active;
 `);
  }

  async down() {
    throw new Error("Restore a verified backup");
  }
}
