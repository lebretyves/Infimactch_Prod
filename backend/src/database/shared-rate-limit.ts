import { MigrationInterface, QueryRunner } from 'typeorm';

export class SharedRateLimit1789848000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE rate_limit_bucket (
      scope varchar(80) NOT NULL,
      key_hash char(64) NOT NULL CHECK(key_hash ~ '^[a-f0-9]{64}$'),
      hits integer NOT NULL CHECK(hits >= 0),
      reset_at timestamptz NOT NULL,
      PRIMARY KEY(scope,key_hash)
    );
    CREATE INDEX rate_limit_bucket_expiry ON rate_limit_bucket(reset_at);`);
  }
  async down() { throw Error('Restore a verified backup'); }
}
