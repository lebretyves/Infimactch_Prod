import { createHmac } from 'node:crypto';
import { rateLimit, type Options, type Store, type IncrementResponse } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import type { SqlClient } from '../database/database';

/** One atomic database counter per scope and pseudonymous IP/session key across instances. */
export class PostgreSqlRateLimitStore implements Store {
  readonly localKeys = false;
  readonly prefix: string;
  private windowMs = 60_000;
  private readonly secret: string;
  constructor(private readonly db: SqlClient, private readonly scope: string, secret = process.env.SESSION_SECRET) {
    if (!/^[a-z][a-z0-9:_-]{0,79}$/.test(scope)) throw Error('Invalid rate limit scope');
    if (!secret || secret.length < 32) throw Error('Rate limiting requires a strong session secret');
    this.secret = secret;
    this.prefix = 'infimatch:' + scope + ':';
  }
  init(options: Options) {
    if (!Number.isSafeInteger(options.windowMs) || options.windowMs < 1 || options.windowMs > 2_147_483_647) throw Error('Invalid rate limit window');
    this.windowMs = options.windowMs;
  }
  private hash(key: string) {
    return createHmac('sha256', this.secret).update('infimatch-rate-limit-v1\0').update(this.scope).update('\0').update(key).digest('hex');
  }
  async increment(key: string): Promise<IncrementResponse> {
    const [row] = await this.db.query(`INSERT INTO rate_limit_bucket(scope,key_hash,hits,reset_at)
      VALUES($1,$2,1,statement_timestamp()+($3::integer * interval '1 millisecond'))
      ON CONFLICT(scope,key_hash) DO UPDATE SET
        hits=CASE WHEN rate_limit_bucket.reset_at<=statement_timestamp() THEN 1 ELSE LEAST(rate_limit_bucket.hits,2147483646)+1 END,
        reset_at=CASE WHEN rate_limit_bucket.reset_at<=statement_timestamp()
          THEN statement_timestamp()+($3::integer * interval '1 millisecond') ELSE rate_limit_bucket.reset_at END
      RETURNING hits,reset_at`, [this.scope,this.hash(key),this.windowMs]);
    if (!row || !Number.isInteger(Number(row.hits)) || Number(row.hits) < 1 || !Number.isFinite(new Date(row.reset_at).getTime())) throw Error('Invalid rate limit counter');
    return {totalHits:Number(row.hits),resetTime:new Date(row.reset_at)};
  }
  async get(key: string): Promise<IncrementResponse | undefined> {
    const [row] = await this.db.query('SELECT hits,reset_at FROM rate_limit_bucket WHERE scope=$1 AND key_hash=$2 AND reset_at>statement_timestamp()', [this.scope,this.hash(key)]);
    return row ? {totalHits:Number(row.hits),resetTime:new Date(row.reset_at)} : undefined;
  }
  async decrement(key: string) {
    await this.db.query('UPDATE rate_limit_bucket SET hits=GREATEST(0,hits-1) WHERE scope=$1 AND key_hash=$2 AND reset_at>statement_timestamp()', [this.scope,this.hash(key)]);
  }
  async resetKey(key: string) {
    await this.db.query('DELETE FROM rate_limit_bucket WHERE scope=$1 AND key_hash=$2', [this.scope,this.hash(key)]);
  }
}

/** No process-local fallback: a failed limiter blocks the protected operation explicitly. */
export function sharedRateLimit(db: SqlClient, scope: string, options: Partial<Options>): RequestHandler {
  const store = new PostgreSqlRateLimitStore(db,scope);
  const middleware = rateLimit({...options,store,passOnStoreError:false});
  return (req,res,next) => {
    return middleware(req,res,error => {
      if (error) {
        res.setHeader('Cache-Control','no-store');
        res.setHeader('Retry-After','60');
        res.status(503).json({code:'RATE_LIMIT_UNAVAILABLE',message:'La protection des accès est temporairement indisponible. Réessayez dans un instant.'});
        return;
      }
      next();
    });
  };
}

/** Called by existing scheduled maintenance; never scans/deletes an unbounded number of rows. */
export async function cleanupSharedRateLimits(db: SqlClient, limit = 500) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 5000) throw Error('Invalid rate limit cleanup batch');
  const removed = await db.query(`WITH expired AS (
      SELECT scope,key_hash FROM rate_limit_bucket WHERE reset_at<statement_timestamp()
      ORDER BY reset_at LIMIT $1 FOR UPDATE SKIP LOCKED
    ) DELETE FROM rate_limit_bucket b USING expired e
      WHERE b.scope=e.scope AND b.key_hash=e.key_hash RETURNING b.scope`,[limit]);
  return {removed:removed.length};
}
