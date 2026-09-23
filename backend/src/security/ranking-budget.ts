import { ServiceUnavailableException } from '@nestjs/common';
import { ipKeyGenerator } from 'express-rate-limit';
import { performance } from 'node:perf_hooks';
import type { SqlClient } from '../database/database';
import { sharedRateLimit } from './shared-rate-limit';

export const rankingRoutes = ['/api/v1/me/matches', '/api/v1/me/recommendations', '/api/v1/me/listings', '/api/v1/listings/search'];
/** One quota per authenticated account, shared across routes, sessions and instances. */
export function rankingRateLimit(db: SqlClient) {
  return sharedRateLimit(db, 'ranking', {
    windowMs: 60_000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false,
    keyGenerator: req => req.session?.userId ? 'user:' + req.session.userId : 'ip:' + ipKeyGenerator(req.ip ?? 'unknown'),
    handler: (_req, res) => { res.setHeader('Cache-Control', 'no-store'); res.status(429).json({code:'RANKING_RATE_LIMIT', message:'Trop de recherches. Patientez une minute avant de recommencer.'}); },
  });
}
/** Fail explicitly instead of returning an incomplete ranking or scanning without a bound. */
export function rankingBudget(clock = () => performance.now()) {
  const deadline = clock() + 8_000;
  let scanned = 0;
  return (count = 0) => {
    scanned += count;
    if (scanned > 10_000 || clock() > deadline)
      throw new ServiceUnavailableException({code:'RANKING_BUDGET_EXCEEDED', message:'Recherche trop volumineuse. Affinez vos critères puis réessayez.'});
  };
}
