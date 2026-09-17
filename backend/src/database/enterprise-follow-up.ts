import {MigrationInterface,QueryRunner} from "typeorm";
export class EnterpriseFollowUp1789381600000 implements MigrationInterface {
 async up(q:QueryRunner){await q.query(`
  ALTER TABLE mission ALTER COLUMN agency_id DROP NOT NULL;
  ALTER TABLE mission ADD COLUMN staffing_request_id uuid REFERENCES staffing_request(id);
  CREATE INDEX mission_staffing_request ON mission(staffing_request_id);
 `);}
 async down(q:QueryRunner){await q.query("ALTER TABLE mission ALTER COLUMN agency_id SET NOT NULL; ALTER TABLE mission DROP COLUMN staffing_request_id");}
}
