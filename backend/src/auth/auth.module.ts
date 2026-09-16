import { sessionTiming } from "./idle-session";
import { ProfileDto, validateProfile } from "../profiles/profiles.module";
import { Type } from "class-transformer";
import { GoogleAuth, type GoogleIdentity } from "./google";
import { FINESS_PATTERN } from "../reference-data/finess";
import { ApiProperty } from "@nestjs/swagger";
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  Module,
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ValidateNested,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";
import { Request, Response } from "express";
import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { Database, audit } from "../database/database";
import { SessionGuard, user } from "../common/access";
class GoogleCredential {
  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^[a-f0-9]{64}$/)
  nonce?: string;
  @ApiProperty()
  @IsString()
  @Length(1, 10000)
  credential!: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(12, 128)
  password?: string;
}

class Credentials {
  @ApiProperty({ type: () => String, required: true })
  @IsEmail()
  @Length(3, 254)
  email!: string;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  @Length(12, 128)
  password!: string;
}
export class RegistrationDetails {
  @ApiProperty({ type: () => ProfileDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileDto)
  profile?: ProfileDto;
  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(/^\d{11}$/)
  rppsNumber?: string;

  @ApiProperty({
    type: () => String,
    required: true,
    enum: ["NURSE", "ENTERPRISE"],
  })
  @IsIn(["NURSE", "ENTERPRISE"])
  family!: "NURSE" | "ENTERPRISE";
  @ApiProperty({ type: () => String, required: true, enum: ["2026-09-14"] })
  @IsIn(["2026-09-14"])
  termsVersion!: string;
  @ApiProperty({
    type: () => String,
    required: false,
    enum: ["AGENCY", "ESTABLISHMENT"],
  })
  @IsOptional()
  @IsIn(["AGENCY", "ESTABLISHMENT"])
  organizationType?: string;
  @ApiProperty({ type: () => String, required: false })
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;
  @ApiProperty({ type: () => String, required: false })
  @IsOptional()
  @IsString()
  @Length(5, 500)
  address?: string;
  @ApiProperty({ type: () => String, required: false })
  @IsOptional()
  @IsString()
  @Length(2, 150)
  referent?: string;
  @ApiProperty({ type: () => String, required: false })
  @IsOptional()
  @Matches(FINESS_PATTERN)
  finess?: string;
  @ApiProperty({ type: () => String, required: false })
  @IsOptional()
  @Matches(/^\d{14}$/)
  siret?: string;
}
class Register extends RegistrationDetails {
  @ApiProperty({ type: String })
  @IsEmail()
  @Length(3, 254)
  email!: string;
  @ApiProperty({ type: String })
  @IsString()
  @Length(12, 128)
  password!: string;
}
@Injectable()
export class AuthService {
  constructor(private readonly db: Database) {}
  async register(body: Register) {
    return this.create(body, body.email, body.password);
  }
  async registerGoogle(body: RegistrationDetails, identity: GoogleIdentity) {
    // Google-only accounts have no user-chosen local password. The random secret is never returned.
    return this.create(body, identity.email, randomBytes(48).toString("hex"), identity.subject);
  }
  private async create(body: RegistrationDetails, email: string, password: string, googleSubject?: string) {
    if (body.profile) validateProfile(body.profile);
    if (
      body.family === "ENTERPRISE" &&
      (!body.organizationType ||
        !body.name ||
        !body.address ||
        !body.referent ||
        (body.organizationType === "ESTABLISHMENT" && !body.finess))
    )
      throw new BadRequestException("Incomplete organization");
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    try {
      return await this.db.transaction(async (em) => {
        const [account] = await em.query(
          "INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,$2,$3,$4) RETURNING id,family,session_version",
          [
            email.trim().toLowerCase(),
            hash,
            body.family,
            body.termsVersion,
          ],
        );
        if (googleSubject)
          await em.query("INSERT INTO google_identity(subject,account_id) VALUES($1,$2)", [googleSubject, account.id]);
        if (body.family === "NURSE") {
          const p = body.profile;
          if (!p)
            await em.query("INSERT INTO profile(user_id) VALUES($1)", [
              account.id,
            ]);
          else {
            await em.query(
              "INSERT INTO profile(user_id,display_name,qualifications,skills,experience,available,unavailable,latitude,longitude,radius_km,accepted_shifts,preferred_shifts,visible,details,rpps_number) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)",
              [
                account.id,
                p.displayName,
                p.qualifications,
                p.skills,
                JSON.stringify(p.experience),
                JSON.stringify(p.available),
                JSON.stringify(p.unavailable),
                p.latitude,
                p.longitude,
                p.radiusKm,
                p.acceptedShifts,
                p.preferredShifts,
                p.visible,
                JSON.stringify(p.details ?? {}),
                body.rppsNumber ?? null,
              ],
            );
            for (const code of p.qualifications)
              await em.query(
                "INSERT INTO profile_qualification(nurse_id,code) VALUES($1,$2)",
                [account.id, code],
              );
          }
        } else {
          const [org] = await em.query(
            "INSERT INTO organization(kind,name,address,referent,finess,siret) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
            [
              body.organizationType,
              body.name,
              body.address,
              body.referent,
              body.finess ?? null,
              body.siret ?? null,
            ],
          );
          await em.query(
            "INSERT INTO membership(user_id,organization_id) VALUES($1,$2)",
            [account.id, org.id],
          );
        }
        await audit(em, account.id, "ACCOUNT_CREATED", account.id);
        if (googleSubject) await audit(em, account.id, "GOOGLE_LINKED", account.id);
        return account;
      });
    } catch (e: any) {
      if (e.code === "23505" && googleSubject)
        throw new ConflictException({ code: "GOOGLE_ACCOUNT_EXISTS", message: "Un compte existe déjà. Reprenez la connexion Google pour accéder à votre compte ou l’associer." });
      if (e.code === "23505")
        throw new BadRequestException(
          "Registration unavailable for these details",
        );
      throw e;
    }
  }
  async login(body: Credentials) {
    const [a] = await this.db.query(
      "SELECT id,family,password_hash,active,session_version FROM account WHERE email=$1",
      [body.email.trim().toLowerCase()],
    );
    // Same expensive password operation for unknown users.
    if (!a) {
      await argon2.hash(body.password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });
      throw new UnauthorizedException("Invalid credentials");
    }
    if (!(await argon2.verify(a.password_hash, body.password)) || !a.active)
      throw new UnauthorizedException("Invalid credentials");
    return {
      id: a.id,
      family: a.family,
      session_version: a.session_version,
    };
  }
}
async function establish(
  req: Request,
  a: {
    id: string;
    family: "NURSE" | "ENTERPRISE";
    session_version: number;
  },
) {
  await new Promise<void>((resolve, reject) =>
    req.session.regenerate((e) => (e ? reject(e) : resolve())),
  );
  req.session.authenticatedAt = Date.now();
  req.session.lastActivityAt = req.session.authenticatedAt;
  req.session.userId = a.id;
  req.session.family = a.family;
  req.session.sessionVersion = a.session_version;
  req.session.csrf = randomBytes(32).toString("hex");
  await new Promise<void>((resolve, reject) =>
    req.session.save((e) => (e ? reject(e) : resolve())),
  );
  return {
    user: { id: a.id, family: a.family },
    csrfToken: req.session.csrf,
  };
}
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly google: GoogleAuth,
    private readonly db: Database,
  ) {}
  @Get("google/config") googleConfig() {
    return this.google.configuration();
  }
  @Post("google/challenge") async googleChallenge(@Req() req: Request) {
    if (!this.google.configuration().enabled)
      throw new BadRequestException("Connexion Google non configurée.");
    const nonce = randomBytes(32).toString("hex");
    const challenge = { nonce, expires: Date.now() + 10 * 60 * 1000 };
    req.session.googleChallenges = [...(req.session.googleChallenges || []).filter(c => c.expires > Date.now()).slice(-7), challenge];
    req.session.googleChallenge = challenge;
    await new Promise<void>((resolve, reject) =>
      req.session.save((e) => (e ? reject(e) : resolve())),
    );
    return { nonce };
  }
  @Post("google") async googleLogin(
    @Body() body: GoogleCredential,
    @Req() req: Request,
  ) {
    const challenge = body.nonce
      ? req.session.googleChallenges?.find(c => c.nonce === body.nonce)
      : req.session.googleChallenge;
    if (challenge) {
      req.session.googleChallenges = (req.session.googleChallenges || []).filter(c => c.nonce !== challenge.nonce && c.expires > Date.now());
      if (req.session.googleChallenge?.nonce === challenge.nonce) delete req.session.googleChallenge;
    }
    delete req.session.googleRegistration;
    await new Promise<void>((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));
    if (!challenge || challenge.expires < Date.now())
      throw new UnauthorizedException({code: "GOOGLE_CHALLENGE_EXPIRED", message: "La demande de connexion Google a expiré. Cliquez à nouveau sur le bouton Google."});
    const result = await this.google.login(body.credential, challenge.nonce, body.password);
    if ("registrationRequired" in result) {
      req.session.googleRegistration = { ...result.identity, expires: Date.now() + 30 * 60 * 1000 };
      await new Promise<void>((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));
      return { registrationRequired: true };
    }
    return establish(req, result);
  }
  @Get("google/registration") googleRegistration(@Req() req: Request) {
    const identity = this.pendingGoogle(req);
    return { email: identity.email, firstName: identity.firstName, lastName: identity.lastName };
  }
  @Post("google/register") async googleRegister(@Req() req: Request, @Body() body: RegistrationDetails) {
    const identity = this.pendingGoogle(req);
    const account = await this.auth.registerGoogle(body, identity);
    return establish(req, account);
  }
  private pendingGoogle(req: Request) {
    const identity = req.session.googleRegistration;
    if (!identity || identity.expires < Date.now())
      throw new UnauthorizedException({ code: "GOOGLE_REGISTRATION_EXPIRED", message: "Votre confirmation Google a expiré. Reprenez la connexion Google ; votre formulaire peut être conservé." });
    return identity;
  }

  @Get("csrf") csrf(@Req() req: Request) {
    req.session.csrf ??= randomBytes(32).toString("hex");
    return { csrfToken: req.session.csrf };
  }
  @Post("register") async register(
    @Body() body: Register,
    @Req() req: Request,
  ) {
    return establish(req, await this.auth.register(body));
  }
  @Post("login") async login(@Body() body: Credentials, @Req() req: Request) {
    return establish(req, await this.auth.login(body));
  }
  @Get("me")
  @UseGuards(SessionGuard)
  async me(@Req() req: Request) {
    const id = user(req);
    const [a] = await this.db.query(
      "SELECT id,email,family,terms_version,terms_at FROM account WHERE id=$1",
      [id],
    );
    const organizations = await this.db.query(
      "SELECT o.* FROM membership m JOIN organization o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.active",
      [id],
    );
    return { ...a, organizations, session: sessionTiming(req.session) };
  }
  @Post("activity")
  @UseGuards(SessionGuard)
  async activity(@Req() req: Request) {
    req.session.lastActivityAt = Date.now();
    await new Promise<void>((resolve,reject)=>req.session.save(error=>error?reject(error):resolve()));
    return sessionTiming(req.session);
  }
  @Post("logout") async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await new Promise<void>((resolve, reject) =>
      req.session.destroy((e) => (e ? reject(e) : resolve())),
    );
    res.clearCookie("infimatch.sid", { path: "/" });
    return { ok: true };
  }
}
@Module({ controllers: [AuthController], providers: [AuthService, GoogleAuth] })
export class AuthModule {}
