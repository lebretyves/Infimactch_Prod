import { MigrationInterface, QueryRunner } from "typeorm";
export class PrivacyRequests1789381100000 implements MigrationInterface {
 async up(q:QueryRunner){await q.query(`
 CREATE TABLE closure_request(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES account(id), status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN('REQUESTED','APPROVED','COMPLETED','CANCELLED')), requested_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz, completed_at timestamptz);
 CREATE UNIQUE INDEX closure_request_pending ON closure_request(account_id) WHERE status IN('REQUESTED','APPROVED');
 `);}
 async down(){throw Error("Restore a verified backup");}
}
