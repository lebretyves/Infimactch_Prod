import { MigrationInterface, QueryRunner } from "typeorm";
export class Extended1789380100000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
 ALTER TABLE profile ADD COLUMN notifications_enabled boolean NOT NULL DEFAULT true;
 CREATE TABLE mission_confirmation(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),assignment_id uuid NOT NULL REFERENCES assignment(id),mission_version integer NOT NULL,template_version integer NOT NULL DEFAULT 1,status text NOT NULL CHECK(status IN('PENDING','READY','FAILED','SUPERSEDED','CANCELLED')),document_id uuid REFERENCES document(id),lease_until timestamptz,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(assignment_id,mission_version,template_version));
 CREATE TABLE reminder_window(mission_id uuid NOT NULL REFERENCES mission(id),version integer NOT NULL,window_key text NOT NULL,event_id uuid NOT NULL REFERENCES outbox(id),PRIMARY KEY(mission_id,version,window_key));
 ALTER TABLE external_offer ADD COLUMN provenance jsonb NOT NULL DEFAULT '{}';
 CREATE TABLE import_run(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),provider text NOT NULL,status text NOT NULL,summary jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE staffing_request(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),establishment_id uuid NOT NULL REFERENCES organization(id),title text NOT NULL,description text NOT NULL,created_by uuid NOT NULL REFERENCES account(id),created_at timestamptz NOT NULL DEFAULT now());
 `);
  }
  async down() {
    throw new Error(
      "Restore a verified backup instead of destructive rollback",
    );
  }
}
