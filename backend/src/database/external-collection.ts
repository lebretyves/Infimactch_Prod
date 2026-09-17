import {MigrationInterface,QueryRunner} from 'typeorm';
export class ExternalCollection1789382100000 implements MigrationInterface {
 async up(q:QueryRunner){await q.query("ALTER TABLE source_control ADD COLUMN collection_state jsonb");}
 async down(q:QueryRunner){await q.query("ALTER TABLE source_control DROP COLUMN collection_state");}
}
