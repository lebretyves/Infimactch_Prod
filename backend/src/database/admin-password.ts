import {MigrationInterface,QueryRunner} from 'typeorm';
export class AdminPassword1790006500000 implements MigrationInterface {
 async up(q:QueryRunner){await q.query('ALTER TABLE platform_admin ADD COLUMN admin_password_hash text');}
 async down(){throw Error('Restore verified backup');}
}
