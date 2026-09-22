import { MigrationInterface, QueryRunner } from "typeorm";

/** Nurse-facing visibility of imported external offers, independent from import scheduling. */
export class ExternalVisibility1790024000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(
      `ALTER TABLE source_control ADD COLUMN visible boolean NOT NULL DEFAULT true`,
    );
  }
  async down() {
    throw new Error("Restore verified backup");
  }
}
