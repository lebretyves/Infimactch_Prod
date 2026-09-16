import { MigrationInterface, QueryRunner } from "typeorm";

export class DocumentSecurity1789380700000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
 ALTER TABLE document ADD COLUMN superseded_at timestamptz;
 CREATE INDEX document_owner_storage_idx
   ON document(owner_id,created_at)
   WHERE status IN('STAGING','READY');
 `);
  }

  async down() {
    throw new Error("Restore a verified backup");
  }
}
