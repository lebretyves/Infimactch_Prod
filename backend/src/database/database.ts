import { Finess1789380300000 } from "./finess";
import { retryTransaction } from "../common/retry";
import { Global, Injectable, Module, OnModuleDestroy } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { required } from "../config";
import { Harden1789380200000 } from "./harden";
import { Extended1789380100000 } from "./extended";
import { InitialSchema1789380000000 } from "./schema";
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
