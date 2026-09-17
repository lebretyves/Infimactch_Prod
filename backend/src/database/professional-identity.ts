import {MigrationInterface,QueryRunner} from 'typeorm';
export class ProfessionalIdentity1789381800000 implements MigrationInterface {
 async up(q:QueryRunner){await q.query(`
 CREATE TABLE professional_identity(user_id uuid NOT NULL REFERENCES account(id),issuer text NOT NULL,subject_name_id text NOT NULL,subject text NOT NULL,authenticated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(issuer,subject_name_id),UNIQUE(user_id,issuer));
 CREATE TABLE psc_challenge(state_hash text PRIMARY KEY,session_hash text NOT NULL,user_id uuid REFERENCES account(id),account_version integer,nonce text NOT NULL,verifier text NOT NULL,expires_at timestamptz NOT NULL);
 CREATE INDEX psc_challenge_expiry ON psc_challenge(expires_at);
 ALTER TABLE profile ADD COLUMN rpps_reason text;
 ALTER TABLE profile ADD COLUMN rpps_identity_review text NOT NULL DEFAULT 'NOT_CHECKED';
 `);}
 async down(){throw Error('Restore verified backup');}
}
