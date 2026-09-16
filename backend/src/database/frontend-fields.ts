import { MigrationInterface, QueryRunner } from "typeorm";
export class FrontendFields1789380500000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      "ALTER TABLE profile ADD COLUMN details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(details)='object')",
    );
    // Existing applications have no trustworthy original submission timestamp.
    await q.query("ALTER TABLE application ADD COLUMN created_at timestamptz");
    await q.query(
      "ALTER TABLE application ALTER COLUMN created_at SET DEFAULT now()",
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query("ALTER TABLE application DROP COLUMN created_at");
    await q.query("ALTER TABLE profile DROP COLUMN details");
  }
}
