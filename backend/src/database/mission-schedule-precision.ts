import { MigrationInterface, QueryRunner } from 'typeorm';
export class MissionSchedulePrecision1789718400000 implements MigrationInterface {
  async up(q:QueryRunner) {
    await q.query("ALTER TABLE mission ADD COLUMN schedule_precision text NOT NULL DEFAULT 'EXACT' CHECK(schedule_precision IN('EXACT','DATE'))");
    await q.query("ALTER TABLE mission DROP CONSTRAINT mission_shift_check");
    await q.query("ALTER TABLE mission ADD CONSTRAINT mission_shift_check CHECK(shift IN('DAY','NIGHT','MIXED','UNKNOWN'))");
  }
  async down(){throw Error('Restore a verified backup to preserve date-only schedules');}
}
