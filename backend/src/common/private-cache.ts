import type { Request, Response, NextFunction } from 'express';
/** Apply before parsers, authentication and rate limits, including errors and anonymous requests. */
export function preventApiCaching(req: Request, res: Response, next: NextFunction) {
 if (req.path === '/api' || req.path.startsWith('/api/')) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
 }
 next();
}
