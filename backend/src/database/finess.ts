import { MigrationInterface, QueryRunner } from "typeorm";
export class Finess1789380300000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
CREATE TABLE finess_snapshot(id integer PRIMARY KEY CHECK(id=1), generated_at timestamptz NOT NULL, source_url text NOT NULL, sha256 text NOT NULL, imported_at timestamptz NOT NULL DEFAULT now(), summary jsonb NOT NULL);
CREATE TABLE finess_establishment(finess text PRIMARY KEY, legal_finess text, name text NOT NULL, status text NOT NULL, address text, postal_code text, city text, category text, longitude double precision, latitude double precision, coordinate_source text, CHECK((longitude IS NULL AND latitude IS NULL) OR (longitude BETWEEN -180 AND 180 AND latitude BETWEEN -90 AND 90)));
CREATE INDEX finess_establishment_name_idx ON finess_establishment(lower(name));
`);
  }
  async down() {
    throw new Error("Restore verified backup");
  }
}
