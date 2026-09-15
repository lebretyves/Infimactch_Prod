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
  UnauthorizedException,
} from "@nestjs/common";
import {
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
import { user } from "../common/access";
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
class Register extends Credentials {
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
@Injectable()
export class AuthService {
  constructor(private readonly db: Database) {}
  async register(body: Register) {
    if (
      body.family === "ENTERPRISE" &&
      (!body.organizationType ||
        !body.name ||
        !body.address ||
        !body.referent ||
        (body.organizationType === "ESTABLISHMENT" && !body.finess))
    )
      throw new BadRequestException("Incomplete organization");
    const hash = await argon2.hash(body.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    try {
      return await this.db.transaction(async (em) => {
        const [account] = await em.query(
          "INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,$2,$3,$4) RETURNING id,family",
          [
            body.email.trim().toLowerCase(),
            hash,
            body.family,
            body.termsVersion,
          ],
        );
        if (body.family === "NURSE")
          await em.query("INSERT INTO profile(user_id) VALUES($1)", [
            account.id,
          ]);
        else {
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
        return account;
      });
    } catch (e: any) {
      if (e.code === "23505")
        throw new BadRequestException(
          "Registration unavailable for these details",
        );
      throw e;
    }
  }
  async login(body: Credentials) {
    const [a] = await this.db.query(
      "SELECT id,family,password_hash FROM account WHERE email=$1",
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
    if (!(await argon2.verify(a.password_hash, body.password)))
      throw new UnauthorizedException("Invalid credentials");
    return { id: a.id, family: a.family };
  }
}
async function establish(
  req: Request,
  a: { id: string; family: "NURSE" | "ENTERPRISE" },
) {
  await new Promise<void>((resolve, reject) =>
    req.session.regenerate((e) => (e ? reject(e) : resolve())),
  );
  req.session.userId = a.id;
  req.session.family = a.family;
  req.session.csrf = randomBytes(32).toString("hex");
  await new Promise<void>((resolve, reject) =>
    req.session.save((e) => (e ? reject(e) : resolve())),
  );
  return { user: a, csrfToken: req.session.csrf };
}
@Controller("auth")
class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly db: Database,
  ) {}
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
  @Get("me") async me(@Req() req: Request) {
    const id = user(req);
    const [a] = await this.db.query(
      "SELECT id,email,family,terms_version,terms_at FROM account WHERE id=$1",
      [id],
    );
    const organizations = await this.db.query(
      "SELECT o.* FROM membership m JOIN organization o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.active",
      [id],
    );
    return { ...a, organizations };
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
@Module({ controllers: [AuthController], providers: [AuthService] })
export class AuthModule {}
