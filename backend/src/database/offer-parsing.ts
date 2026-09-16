import { MigrationInterface, QueryRunner } from "typeorm";
export class OfferParsing1789381000000 implements MigrationInterface {
 async up(q: QueryRunner): Promise<void> { await q.query("ALTER TABLE external_offer ADD COLUMN parsed_offer jsonb"); }
 async down(q: QueryRunner): Promise<void> { await q.query("ALTER TABLE external_offer DROP COLUMN parsed_offer"); }
}
