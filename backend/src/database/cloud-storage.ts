import { MigrationInterface, QueryRunner } from "typeorm";
export class CloudStorage1789381500000 implements MigrationInterface {
 async up(q: QueryRunner) { await q.query(`
  ALTER TABLE document ADD COLUMN storage_backend text NOT NULL DEFAULT 'filesystem' CHECK(storage_backend IN('filesystem','postgres'));
  CREATE TABLE document_blob(document_id uuid PRIMARY KEY REFERENCES document(id) ON DELETE CASCADE, encrypted bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
 `); }
 async down(q: QueryRunner) { await q.query("DROP TABLE document_blob; ALTER TABLE document DROP COLUMN storage_backend"); }
}
