import {MigrationInterface,QueryRunner} from 'typeorm';
export class PersonalCorrections1789382300000 implements MigrationInterface {
 async up(q:QueryRunner){await q.query(`CREATE TABLE personal_correction_request (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES account(id),
 field text NOT NULL CHECK(field IN('firstName','lastName','city','phone','birthDate','address','postalCode','email')),
 proposed_value text NOT NULL, previous_value text NOT NULL,
 status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN('REQUESTED','COMPLETED','REJECTED')),
 requested_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 reviewed_by uuid REFERENCES account(id), decision_reason text);
 CREATE UNIQUE INDEX personal_correction_pending ON personal_correction_request(account_id) WHERE status='REQUESTED';
 CREATE INDEX personal_correction_date ON personal_correction_request(requested_at DESC);`);}
 async down(){throw Error('Restore a verified backup');}
}
