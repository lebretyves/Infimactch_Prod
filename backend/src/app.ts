import {CloudJobsModule} from "./automation/cloud-jobs.module";
import type { IncomingMessage, ServerResponse } from "node:http";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrivacyModule } from "./security/privacy.module";
import { idleSession } from "./auth/idle-session";
import { authRateLimit } from "./auth/auth-rate-limit";
import { configureOpenApi } from "./openapi";
import { FinessModule } from "./reference-data/finess.module";
import "reflect-metadata";
import "./config";
import {
  Module,
  Controller,
  Get,
  ValidationPipe,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { DatabaseModule, Database } from "./database/database";
import { AuthModule } from "./auth/auth.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { MissionsModule } from "./missions/missions.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { ReferenceDataModule } from "./reference-data/reference-data.module";
import { AutomationModule } from "./automation/automation.module";
import { MatchingModule } from "./matching/matching.module";
import { ListingsModule } from "./listings/listings.module";
import { DocumentsModule } from "./documents/documents.module";
import { parseTrustProxy, required, validateConfiguration } from "./config";
@Controller()
class HealthController {
  constructor(private readonly db: Database) {}
  @Get("health") async health() {
    await this.db.query("SELECT 1");
    return { status: "ok", application: "InfiMatch" };
  }
}
@Module({
  imports: [
    DatabaseModule,
    PrivacyModule,
    NotificationsModule,
    AuthModule,
    ProfilesModule,
    MissionsModule,
    MatchingModule,
    ListingsModule,
    DocumentsModule,
    AutomationModule,
    CloudJobsModule,
    OrganizationsModule,
    ReferenceDataModule,
    FinessModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
@Catch()
class Errors implements ExceptionFilter {
  constructor(private readonly db: Database) {}
  async catch(error: any, host: ArgumentsHost) {
    const http = host.switchToHttp(),
      res = http.getResponse(),
      req = http.getRequest();
    const status =
      error?.type === "entity.too.large"
        ? 413
        : error?.type === "entity.parse.failed"
          ? 400
          : error instanceof HttpException
            ? error.getStatus()
            : ["23505", "23P01", "23514", "40001", "40P01"].includes(
                  error?.code,
                )
              ? 409
              : 500;
    const detail =
      error instanceof HttpException ? error.getResponse() : undefined;
    const message =
      status === 500
        ? "Internal server error"
        : typeof detail === "string"
          ? detail
          : ((detail as any)?.message ?? "Request conflict");
    if (req.session?.userId && [403, 404].includes(status))
      await this.db
        .query(
          "INSERT INTO audit(actor_id,event,details) VALUES($1,'ACCESS_DENIED',$2)",
          [
            req.session.userId,
            JSON.stringify({
              method: req.method,
              path: req.path,
              status,
              requestId: req.requestId,
            }),
          ],
        )
        .catch(() => {});
    res.status(status).json({
      code: (detail as any)?.code ?? "HTTP_" + status,
      message,
      fields: (detail as any)?.reasons ?? null,
      requestId: req.requestId,
    });
  }
}
export async function createApp() {
  validateConfiguration();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["error", "warn"],
  });
  app.set("trust proxy", parseTrustProxy());
  app.setGlobalPrefix("api/v1");
  app.useBodyParser("json", { limit: "7mb" });
  app.use((req: any, res: any, next: any) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    next();
  });
  app.use(helmet());
  app.enableCors({ origin: required("APP_ORIGIN"), credentials: true });
  const pool = new Pool({ connectionString: required("DATABASE_URL"), max: 4 });
  const Store = connectPgSimple(session);
  const sessionStore = new Store({ pool, tableName: "session" });
  app.use(
    session({
      name: "infimatch.sid",
      secret: required("SESSION_SECRET"),
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 8 * 60 * 60 * 1000,
      },
    }),
  );
  app.use((req: any, res: any, next: any) => {
    if (req.session?.userId || req.path.startsWith("/api/v1/auth"))
      res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(idleSession);
  app.use("/api/v1/auth", authRateLimit());
  app.use("/api/v1/auth/activity", rateLimit({windowMs: 60_000, limit: 20, keyGenerator: req => req.sessionID, standardHeaders: "draft-8", legacyHeaders: false}));
  app.use(
    "/api/v1/profile/rpps",
    rateLimit({
      windowMs: 60 * 1000,
      limit: 5,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use((req: any, res: any, next: any) => {
    if (
      ["GET", "HEAD", "OPTIONS"].includes(req.method) ||
      req.path.startsWith("/api/v1/internal/automation/")
    )
      return next();
    const origin = req.get("origin"),
      provided = req.get("x-csrf-token"),
      expected = req.session?.csrf;
    if (
      origin !== required("APP_ORIGIN") ||
      typeof provided !== "string" ||
      !expected ||
      Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    )
      return res.status(403).json({
        code: "CSRF_INVALID",
        message: "Invalid origin or CSRF token",
        requestId: req.requestId,
      });
    next();
  });
  app.use(
    "/api/v1/me/documents",
    rateLimit({
      windowMs: 60000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use(
    "/api/v1/me/matches",
    rateLimit({
      windowMs: 60000,
      limit: 15,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new Errors(app.get(Database)));
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("InfiMatch backend V1")
      .setVersion("0.1.0")
      .addCookieAuth("infimatch.sid")
      .build(),
  );
  configureOpenApi(document);
  SwaggerModule.setup("api/docs", app, document);
  app.enableShutdownHooks();
  const close = app.close.bind(app);
  app.close = async () => {
    await close();
    await sessionStore.close();
    await pool.end();
  };
  await app.init();
  return app;
}

// Vercel detects src/app.ts as an entrypoint. Reuse one initialized Nest app
// across warm/concurrent requests; a failed initialization may be retried.
let vercelApplication: Promise<NestExpressApplication> | undefined;
export default async function vercelHandler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  vercelApplication ??= createApp().catch((error) => {
    vercelApplication = undefined;
    throw error;
  });
  const app = await vercelApplication;
  app.getHttpAdapter().getInstance()(request, response);
}
