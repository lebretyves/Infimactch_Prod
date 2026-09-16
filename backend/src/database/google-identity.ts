import { MigrationInterface, QueryRunner } from "typeorm";
export class GoogleIdentity1789380400000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      "CREATE TABLE google_identity(subject text PRIMARY KEY, account_id uuid NOT NULL UNIQUE REFERENCES account(id), created_at timestamptz NOT NULL DEFAULT now())",
    );
  }
  async down(): Promise<void> {
    throw new Error(
      "Restore a verified backup instead of deleting account identities.",
    );
  }
}
