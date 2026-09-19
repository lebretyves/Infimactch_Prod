import {MigrationInterface,QueryRunner} from 'typeorm';
export class ContractPreparation1789855200000 implements MigrationInterface {
 async up(q:QueryRunner){await q.query(`
 CREATE TABLE contract_preparation(
 assignment_id uuid PRIMARY KEY REFERENCES assignment(id) ON DELETE CASCADE,
 version integer NOT NULL CHECK(version>0),
 notes jsonb NOT NULL CHECK(jsonb_typeof(notes)='object' AND pg_column_size(notes)<=40000),
 created_by uuid NOT NULL REFERENCES account(id),updated_by uuid NOT NULL REFERENCES account(id),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX contract_preparation_author ON contract_preparation(created_by);
 CREATE INDEX contract_preparation_editor ON contract_preparation(updated_by);
 `);}
 async down(){throw Error('Restore a verified backup instead of destructive rollback');}
}
