import {MigrationInterface,QueryRunner} from 'typeorm';

export class AdminOperations1789381900000 implements MigrationInterface {
  async up(q:QueryRunner) {
    await q.query(`
      ALTER TABLE account ADD COLUMN platform_only boolean NOT NULL DEFAULT false;
      CREATE TABLE source_control (
        provider text PRIMARY KEY CHECK(provider IN ('FRANCE_TRAVAIL','JOBSPIPE')),
        enabled boolean NOT NULL DEFAULT true,
        last_started_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO source_control(provider) VALUES('FRANCE_TRAVAIL'),('JOBSPIPE');
      CREATE TABLE professional_review (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES account(id),
        actor_id uuid NOT NULL REFERENCES account(id),
        state text NOT NULL CHECK(state IN ('TO_REVIEW','REVIEWED','NEEDS_INFORMATION')),
        reason text NOT NULL CHECK(length(reason) BETWEEN 8 AND 500),
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX professional_review_account ON professional_review(user_id,created_at DESC);
      CREATE TABLE operational_incident (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service text NOT NULL CHECK(service IN ('API','POSTGRES','MONGODB','N8N','DISCORD','IMPORTS','DOCUMENTS','VAULT')),
        state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','INVESTIGATING','RESOLVED')),
        impact text NOT NULL CHECK(length(impact) BETWEEN 8 AND 500),
        owner_label text NOT NULL CHECK(length(owner_label) BETWEEN 2 AND 100),
        started_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        resolved_at timestamptz
      );
      CREATE INDEX operational_incident_state ON operational_incident(state,updated_at DESC);
    `);
  }
  async down(){throw Error('Restore verified backup');}
}
