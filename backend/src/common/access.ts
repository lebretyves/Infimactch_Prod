import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { Database, SqlClient } from "../database/database";
declare module "express-session" {
  interface SessionData {
    userId: string;
    family: "NURSE" | "ENTERPRISE";
    csrf: string;
    googleChallenge?: { nonce: string; expires: number };
    googleChallenges?: { nonce: string; expires: number }[];
    googleRegistration?: { subject: string; email: string; firstName?: string; lastName?: string; expires: number };
    sessionVersion: number;
    authenticatedAt?: number;
    lastActivityAt?: number;
  }
}
export function user(req: Request): string {
  if (!req.session.userId) throw new UnauthorizedException();
  return req.session.userId;
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly db: Database) {}
  async canActivate(context: ExecutionContext) {
    const req: Request = context.switchToHttp().getRequest();
    const actor = user(req);
    const version = req.session.sessionVersion;
    const active = Number.isSafeInteger(version)
      ? await this.db.query(
          "SELECT 1 FROM account WHERE id=$1 AND active AND NOT platform_only AND session_version=$2",
          [actor, version],
        )
      : [];
    if (!active.length) {
      await this.db
        .query(
          "INSERT INTO audit(actor_id,event,resource_id,details) VALUES($1,'ACCOUNT_SESSION_REJECTED',$1,$2)",
          [
            actor,
            JSON.stringify({ requestId: (req as any).requestId ?? null }),
          ],
        )
        .catch(() => {});
      await new Promise<void>((resolve) =>
        req.session.destroy(() => resolve()),
      );
      throw new UnauthorizedException("Session no longer valid");
    }
    return true;
  }
}
export async function member(
  em: SqlClient,
  actor: string,
  org: string,
  kind?: string,
): Promise<void> {
  const rows = await em.query(
    "SELECT o.kind FROM membership m JOIN organization o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.organization_id=$2 AND m.active FOR SHARE OF m",
    [actor, org],
  );
  if (!rows.length || (kind && rows[0].kind !== kind))
    throw new NotFoundException();
}
export async function nurse(em: SqlClient, actor: string): Promise<any> {
  const rows = await em.query(
    "SELECT * FROM profile WHERE user_id=$1 FOR UPDATE",
    [actor],
  );
  if (!rows.length) throw new NotFoundException();
  return rows[0];
}

// Call inside the business transaction. A suspension waits for existing writes and
// a completed suspension prevents new writes; confirmed missions remain untouched.
export async function requireActiveAccount(em: SqlClient, actor: string): Promise<void> {
  const rows = await em.query("SELECT id FROM account WHERE id=$1 AND active FOR SHARE", [actor]);
  if (!rows.length) throw new NotFoundException("Account unavailable");
}
