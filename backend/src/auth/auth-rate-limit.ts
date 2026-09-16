import { rateLimit } from "express-rate-limit";
export const authRateLimit = () =>
  rateLimit({
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
