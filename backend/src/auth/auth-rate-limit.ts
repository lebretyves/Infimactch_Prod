import { sharedRateLimit } from "../security/shared-rate-limit";
import type { SqlClient } from "../database/database";
export const authRateLimit = (db: SqlClient, scope: "auth" | "admin" = "auth") =>
  sharedRateLimit(db, scope, {
    windowMs: 15 * 60 * 1000,
    limit: 50,
    skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method) || (req.path === "/activity" && !!req.session?.userId),
    handler: (_req, res) =>
      res
        .status(429)
        .json({
          code: "RATE_LIMITED",
          message: "Trop de tentatives. Réessayez dans quelques minutes.",
        }),
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
