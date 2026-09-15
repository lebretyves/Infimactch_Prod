import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { SqlClient } from "../database/database";
declare module "express-session" {
  interface SessionData {
    userId: string;
    family: "NURSE" | "ENTERPRISE";
    csrf: string;
  }
}
export function user(req: Request): string {
  if (!req.session.userId) throw new UnauthorizedException();
  return req.session.userId;
}
@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    user(context.switchToHttp().getRequest());
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
