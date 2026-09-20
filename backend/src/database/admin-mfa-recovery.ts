import {MigrationInterface,QueryRunner} from 'typeorm';
export class AdminMfaRecovery1789905600000 implements MigrationInterface {
 async up(q:QueryRunner){await q.query("ALTER TABLE platform_admin ADD COLUMN recovery_hashes text[] NOT NULL DEFAULT '{}'");}
 async down(){throw Error('Restore verified backup');}
}
