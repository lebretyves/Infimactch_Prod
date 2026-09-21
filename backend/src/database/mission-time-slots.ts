import { MigrationInterface, QueryRunner } from 'typeorm';
export class MissionTimeSlots1790006600000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query("ALTER TABLE mission DROP CONSTRAINT mission_shift_check");
    await q.query("ALTER TABLE mission ADD CONSTRAINT mission_shift_check CHECK(shift IN('MORNING','AFTERNOON','DAY','NIGHT','MIXED','UNKNOWN'))");
  }
  async down() { throw Error('Restore a verified backup to preserve morning and afternoon missions'); }
}
