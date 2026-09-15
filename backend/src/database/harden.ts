import { MigrationInterface, QueryRunner } from "typeorm";
export class Harden1789380200000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
 ALTER TABLE mission_confirmation ADD COLUMN lease_token uuid;
 CREATE TABLE profile_qualification(nurse_id uuid NOT NULL REFERENCES profile(user_id),code text NOT NULL CHECK(code IN('IDE','IADE','IBODE')),state text NOT NULL DEFAULT 'DECLARED' CHECK(state IN('DECLARED','VERIFIED')),declared_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(nurse_id,code));
 INSERT INTO profile_qualification(nurse_id,code) SELECT user_id,unnest(qualifications) FROM profile;
 CREATE INDEX outbox_dispatch_idx ON outbox(available_at,created_at) WHERE completed_at IS NULL;
 CREATE INDEX application_nurse_idx ON application(nurse_id,updated_at DESC);
 CREATE INDEX mission_agency_idx ON mission(agency_id,status);
 CREATE INDEX assignment_nurse_idx ON assignment(nurse_id,start_at);
 `);
  }
  async down() {
    throw new Error("Restore verified backup");
  }
}
