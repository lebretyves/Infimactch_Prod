import type { Request, Response, NextFunction } from "express";
export const SESSION_IDLE_MS = 15 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
export function sessionExpired(s: {lastActivityAt?: number; authenticatedAt?: number}, now=Date.now()) {
 return !Number.isFinite(s.lastActivityAt) || !Number.isFinite(s.authenticatedAt) || now-s.lastActivityAt! >= SESSION_IDLE_MS || now-s.authenticatedAt! >= SESSION_ABSOLUTE_MS || s.lastActivityAt! > now;
}
export function idleSession(req: Request, res: Response, next: NextFunction) {
 if(!req.session?.userId || !sessionExpired(req.session)) return next();
 req.session.destroy(error => {
  res.clearCookie("infimatch.sid",{path:"/"});
  res.setHeader("Cache-Control","no-store");
  if(error) return res.status(503).json({code:"SESSION_UNAVAILABLE",message:"Session indisponible. Reconnectez-vous."});
  return res.status(401).json({code:"SESSION_IDLE_EXPIRED",message:"Votre session a expiré. Reconnectez-vous."});
 });
}
export function sessionTiming(s: {lastActivityAt?:number;authenticatedAt?:number}) {
 return {idleTimeoutMs:SESSION_IDLE_MS,idleExpiresAt:Math.min((s.lastActivityAt || 0)+SESSION_IDLE_MS,(s.authenticatedAt || 0)+SESSION_ABSOLUTE_MS)};
}
