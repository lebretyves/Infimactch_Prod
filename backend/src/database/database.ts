import { ClientRequests1789382000000 } from "./client-requests";
import { AdminOperations1789381900000 } from "./admin-operations";
import { ProfessionalIdentity1789381800000 } from "./professional-identity";
import { PlatformAdmin1789381700000 } from "./platform-admin";
import { EnterpriseFollowUp1789381600000 } from "./enterprise-follow-up";
import { CloudStorage1789381500000 } from "./cloud-storage";
import { NotificationCenter1789381400000 } from "./notification-center";
import { notifyAudit } from "../notifications/events";
import { DiscordNotifications1789381300000 } from "./discord-notifications";
import { ErasureRecovery1789381200000 } from "./erasure-recovery";
import { PrivacyRequests1789381100000 } from "./privacy-requests";
import { OfferParsing1789381000000 } from "./offer-parsing";
import { StaffingRequestDetails1789380600000 } from "./staffing-request-details";
import { FrontendFields1789380500000 } from "./frontend-fields";
import { GoogleIdentity1789380400000 } from "./google-identity";
import { Finess1789380300000 } from "./finess";
import { retryTransaction } from "../common/retry";
import { Global, Injectable, Module, OnModuleDestroy } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { required } from "../config";
import { Harden1789380200000 } from "./harden";
import { Extended1789380100000 } from "./extended";
import { InitialSchema1789380000000 } from "./schema";
import { DocumentSecurity1789380700000 } from "./document-security";
import { AccountSecurity1789380800000 } from "./account-security";
@Injectable()
export class Database implements OnModuleDestroy {
  readonly source = new DataSource({
    type: "postgres",
    url: required("DATABASE_URL"),
    synchronize: false,
    migrations: [
      InitialSchema1789380000000,
      Extended1789380100000,
      Harden1789380200000,
      Finess1789380300000,
      GoogleIdentity1789380400000,
      FrontendFields1789380500000,
      StaffingRequestDetails1789380600000,
      DocumentSecurity1789380700000,
      AccountSecurity1789380800000,
      OfferParsing1789381000000,
      PrivacyRequests1789381100000,
      ErasureRecovery1789381200000,
      DiscordNotifications1789381300000,
      NotificationCenter1789381400000,
      CloudStorage1789381500000,
      EnterpriseFollowUp1789381600000,
      PlatformAdmin1789381700000,
      ProfessionalIdentity1789381800000,
      AdminOperations1789381900000,
      ClientRequests1789382000000,
    ],
    logging: false,
    extra: { max: 12 },
  });
  async connect() {
    if (!this.source.isInitialized) await this.source.initialize();
    return this;
  }
  async query(sql: string, parameters: unknown[] = []): Promise<any[]> {
    return queryRows(await this.source.query(sql, parameters));
  }
  transaction<T>(fn: (em: SqlClient) => Promise<T>): Promise<T> {
    return retryTransaction(() =>
      this.source.transaction((em) =>
        fn({
          query: async (sql, parameters = []) =>
            queryRows(await em.query(sql, parameters)),
        }),
      ),
    );
  }
  async onModuleDestroy() {
    if (this.source.isInitialized) await this.source.destroy();
  }
}
@Global()
@Module({
  providers: [
    { provide: Database, useFactory: async () => new Database().connect() },
  ],
  exports: [Database],
})
export class DatabaseModule {}
export async function audit(
  em: SqlClient,
  actor: string | null,
  event: string,
  id: string | null,
  details: unknown = {},
) {
  await em.query(
    "INSERT INTO audit(actor_id,event,resource_id,details) VALUES($1,$2,$3,$4)",
    [actor, event, id, JSON.stringify(details)],
  );
  await notifyAudit(em, actor, event, id, details);
}
export async function event(em: SqlClient, name: string, payload: unknown) {
  await em.query("INSERT INTO outbox(event,payload) VALUES($1,$2)", [
    name,
    JSON.stringify(payload),
  ]);
}

export interface SqlClient {
  query(sql: string, parameters?: unknown[]): Promise<any[]>;
}
function queryRows(result: any): any[] {
  return Array.isArray(result) &&
    result.length === 2 &&
    Array.isArray(result[0]) &&
    typeof result[1] === "number"
    ? result[0]
    : result;
}

export async function queueProfileMatches(em: SqlClient, actor: string) {
  await em.query(
    "INSERT INTO outbox(event,payload) SELECT 'MatchRequested',jsonb_build_object('missionId',m.id,'version',m.version,'profileId',$1::uuid) FROM mission m JOIN profile p ON p.user_id=$1 WHERE m.status='OPEN' AND m.end_at>now() AND m.qualification=ANY(p.qualifications)",
    [actor],
  );
}
