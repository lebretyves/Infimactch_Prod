import {MigrationInterface,QueryRunner} from 'typeorm';
export class PlatformAdmin1789381700000 implements MigrationInterface {
 async up(q:QueryRunner){await q.query(`
 CREATE TABLE platform_admin(user_id uuid PRIMARY KEY REFERENCES account(id),role text NOT NULL CHECK(role IN('OWNER','SUPPORT','OPS','AUDITOR')),active boolean NOT NULL DEFAULT true,version integer NOT NULL DEFAULT 1,totp_secret text,last_counter bigint NOT NULL DEFAULT -1,invitation_hash text,invitation_expires_at timestamptz,failed_attempts integer NOT NULL DEFAULT 0,locked_until timestamptz,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE admin_session(sid varchar PRIMARY KEY,sess json NOT NULL,expire timestamp(6) NOT NULL);
 CREATE INDEX admin_session_expire ON admin_session(expire);
 CREATE TABLE operational_check(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),service text NOT NULL,state text NOT NULL,summary jsonb NOT NULL DEFAULT '{}',checked_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX operational_check_service ON operational_check(service,checked_at DESC);
 `);}
 async down(){throw Error('Restore verified backup');}
}
