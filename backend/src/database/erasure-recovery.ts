import { MigrationInterface, QueryRunner } from "typeorm";
export class ErasureRecovery1789381200000 implements MigrationInterface {
 async up(q:QueryRunner){await q.query(`CREATE TABLE document_erasure(id uuid PRIMARY KEY, owner_id uuid, created_at timestamptz NOT NULL DEFAULT now());`);}
 async down(){throw Error("Restore a verified backup");}
}
