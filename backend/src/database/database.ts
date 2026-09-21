import {MissionTimeSlots1790006600000} from './mission-time-slots';
import {AdminPassword1790006500000} from './admin-password';
import {MissionLocationOptional1790006400000} from "./mission-location-optional";
import {AdminMfaRecovery1789905600000} from './admin-mfa-recovery';
import {ContractPreparation1789855200000} from './contract-preparation';
import {SupportTickets1789851600000} from "./support-tickets";
import { SharedRateLimit1789848000000 } from "./shared-rate-limit";
import { RecoveryEmail1789840800000 } from "./recovery-email";
import { EmailDelivery1789844400000 } from "./email-delivery";
import { MissionGuardrails1789826400000 } from "./mission-guardrails";
import { postgresConnection } from "./connection";
import { mutedDemoMissionIds } from "../notifications/demo-suppression";
import {MissionMail1789722000000} from './mission-mail';
import {MissionSchedulePrecision1789718400000} from "./mission-schedule-precision";
import {PersonalCorrections1789382300000} from './personal-corrections';
import { JobsPipeCredits1789382200000 } from "./jobspipe-credits";
import { ExternalCollection1789382100000 } from "./external-collection";
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
import { DataSource } from "typeorm";
import { Harden1789380200000 } from "./harden";
import { Extended1789380100000 } from "./extended";
import { InitialSchema1789380000000 } from "./schema";
import { DocumentSecurity1789380700000 } from "./document-security";
import { AccountSecurity1789380800000 } from "./account-security";
@Injectable()
export class Database implements OnModuleDestroy {
  private readonly connection = postgresConnection();
  readonly source = new DataSource({
    type: "postgres",
    url: this.connection.connectionString,
    ssl: this.connection.ssl,
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
      ExternalCollection1789382100000,
      JobsPipeCredits1789382200000,
      PersonalCorrections1789382300000,
      MissionSchedulePrecision1789718400000,
      MissionMail1789722000000,
      MissionGuardrails1789826400000,
      RecoveryEmail1789840800000,
      EmailDelivery1789844400000,
      SupportTickets1789851600000,
      SharedRateLimit1789848000000,
      ContractPreparation1789855200000,
      AdminMfaRecovery1789905600000,
      MissionLocationOptional1790006400000,
      AdminPassword1790006500000,
      MissionTimeSlots1790006600000,
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
  await notifyAudit(em, event, id, details);
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
    "INSERT INTO outbox(event,payload) SELECT 'MatchRequested',jsonb_build_object('missionId',m.id,'version',m.version,'profileId',$1::uuid) FROM mission m JOIN profile p ON p.user_id=$1 WHERE m.id<>ALL($2::uuid[]) AND m.status='OPEN' AND m.end_at>now() AND m.qualification=ANY(p.qualifications)",
    [actor, mutedDemoMissionIds],
  );
}
