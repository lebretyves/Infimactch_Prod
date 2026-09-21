import {MigrationInterface,QueryRunner} from 'typeorm';
export class CvDocuments1790023000000 implements MigrationInterface {
 async up(q:QueryRunner){await q.query(`ALTER TABLE document DROP CONSTRAINT document_kind_check;
 ALTER TABLE document ADD CONSTRAINT document_kind_check CHECK(kind IN('EVIDENCE','CONFIRMATION','BANK','CANCELLATION','CV'));`);}
 async down(){throw new Error('CV documents must be retained; use a forward migration.');}
}
