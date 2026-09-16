import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import * as argon2 from "argon2";
import { Database, audit } from "../database/database";

export type GoogleIdentity = { subject: string; email: string; firstName?: string; lastName?: string };
type GoogleLogin = { id: string; family: "NURSE" | "ENTERPRISE"; session_version: number } | { registrationRequired: true; identity: GoogleIdentity };
export function googleClaims(payload: TokenPayload | undefined, nonce: string) {
  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true ||
    (payload as TokenPayload & { nonce?: string }).nonce !== nonce
  )
    throw new UnauthorizedException("Connexion Google invalide.");
  return { subject: payload.sub, email: payload.email.trim().toLowerCase(),
    ...(payload.given_name ? { firstName: payload.given_name.trim().slice(0, 100) } : {}),
    ...(payload.family_name ? { lastName: payload.family_name.trim().slice(0, 100) } : {}),
  };
}
@Injectable()
export class GoogleAuth {
  private readonly client = new OAuth2Client({ transporterOptions: { timeout: 10000, retry: false } });
  constructor(private readonly db: Database) {}
  configuration() {
    return {
      enabled: !!process.env.GOOGLE_CLIENT_ID,
      clientId: process.env.GOOGLE_CLIENT_ID || null,
    };
  }
  async login(credential: string, nonce: string, password?: string): Promise<GoogleLogin> {
    const audience = process.env.GOOGLE_CLIENT_ID;
    if (!audience)
      throw new ServiceUnavailableException("Connexion Google non configurée.");
    let identity: GoogleIdentity;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience,
      });
      identity = googleClaims(ticket.getPayload(), nonce);
    } catch (error) {
      // Transport/certificate outages are service failures, never proof of an invalid user token.
      if (error instanceof Error && error.message.startsWith("Failed to retrieve verification certificates"))
        throw new ServiceUnavailableException({ code: "GOOGLE_UNAVAILABLE", message: "Le serveur ne peut pas vérifier Google pour le moment. Réessayez dans un instant ou utilisez votre mot de passe InfiMatch." });
      throw new UnauthorizedException({code: "GOOGLE_TOKEN_INVALID", message: "La réponse de Google est invalide ou expirée. Relancez la connexion Google."});
    }
    return this.db.transaction(async (em) => {
      const [linked] = await em.query(
        "SELECT a.id,a.family,a.active,a.session_version FROM google_identity g JOIN account a ON a.id=g.account_id WHERE g.subject=$1",
        [identity.subject],
      );
      if (linked) {
        if (!linked.active) throw new UnauthorizedException("Invalid credentials");
        return { id: linked.id, family: linked.family, session_version: linked.session_version };
      }
      const [a] = await em.query(
        "SELECT id,family,password_hash,active,session_version FROM account WHERE email=$1",
        [identity.email],
      );
      if (!a) return { registrationRequired: true as const, identity };
      if (!a.active) throw new UnauthorizedException("Invalid credentials");
      if (!password)
        throw new ConflictException({
          code: "GOOGLE_LINK_REQUIRED",
          message: "Un compte InfiMatch existe déjà avec cette adresse. Saisissez son mot de passe pour associer Google.",
        });
      if (!(await argon2.verify(a.password_hash, password)))
        throw new UnauthorizedException({code: "GOOGLE_PASSWORD_INVALID", message: "Le mot de passe InfiMatch est incorrect. Saisissez celui de votre compte InfiMatch, pas votre mot de passe Google."});
      await em.query(
        "INSERT INTO google_identity(subject,account_id) VALUES($1,$2)",
        [identity.subject, a.id],
      );
      await audit(em, a.id, "GOOGLE_LINKED", a.id);
      return { id: a.id, family: a.family, session_version: a.session_version };
    });
  }
}
