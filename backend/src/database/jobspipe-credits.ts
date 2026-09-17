import { MigrationInterface, QueryRunner } from "typeorm";

export class JobsPipeCredits1789382200000 implements MigrationInterface {
  name = "JobsPipeCredits1789382200000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE IF NOT EXISTS jobspipe_request_receipt (
      request_key text PRIMARY KEY,
      budget_month date NOT NULL,
      charged integer NOT NULL CHECK (charged BETWEEN 0 AND 25),
      state text NOT NULL CHECK (state IN ('RESERVED','SUCCESS','RETRY','BLOCKED')),
      created_at timestamptz NOT NULL DEFAULT now(),
      lease_until timestamptz,
      response jsonb,
      http_status integer
    )`);
    await q.query(`CREATE INDEX IF NOT EXISTS jobspipe_receipt_month ON jobspipe_request_receipt(budget_month)`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS jobspipe_request_receipt`);
  }
}
