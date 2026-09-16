import { MigrationInterface, QueryRunner } from "typeorm";
export class StaffingRequestDetails1789380600000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(
      `ALTER TABLE staffing_request ADD COLUMN details jsonb CHECK(details IS NULL OR jsonb_typeof(details)='object'), ADD COLUMN updated_at timestamptz`,
    );
  }
  async down() {
    throw new Error("Restore verified backup");
  }
}
