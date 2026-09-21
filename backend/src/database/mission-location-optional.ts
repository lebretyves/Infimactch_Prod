import { MigrationInterface, QueryRunner } from "typeorm";

export class MissionLocationOptional1790006400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE mission ALTER COLUMN location DROP NOT NULL");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    // Refuse rollback while unknown positions exist; never invent or delete them.
    await queryRunner.query("ALTER TABLE mission ALTER COLUMN location SET NOT NULL");
  }
}
