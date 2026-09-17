import {UseInterceptors} from "@nestjs/common";
import {ExecutionTrace} from "./execution-trace";
import { geodesicKm } from "../database/distance";
import {
  Injectable,
  Controller,
  Post,
  Get,
  Param,
  Headers,
  Module,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  ParseUUIDPipe,
} from "@nestjs/common";
import { timingSafeEqual, randomUUID } from "node:crypto";
import PDFDocument from "pdfkit";
import { Database, audit, event } from "../database/database";
import { required } from "../config";
import {
  DocumentsModule,
  DocumentsService,
} from "../documents/documents.module";
import {
  lockMission,
  missionSelect,
  matchingMission,
} from "../missions/missions.service";
import { professional } from "../profiles/profiles.module";
import { match } from "../domain/matching";
import { notificationMessage } from "../domain/notification-messages";
async function missionNotice(em: import("../database/database").SqlClient, eventId: string, recipient: {user_id:string;role:string}, kind: "MATCH"|"REMINDER"|"CONFIRMATION"|"CANCELLATION", m: any) {
  const org = recipient.role === "NURSE" ? null : recipient.role === "AGENCY" ? m.agency_id : m.establishment_id;
  const href = (recipient.role === "NURSE" ? "/missions/m_" : "/gestion/missions/") + m.id;
  const message = kind === "CANCELLATION" && recipient.role === "NURSE" ? "La mission qui vous concernait a ?t? annul?e. Consultez le suivi dans InfiMatch." : notificationMessage(recipient.role as any, kind);
  return em.query("INSERT INTO notification(user_id,event_id,kind,message,organization_id,href,context) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING id", [recipient.user_id,eventId,kind,message,org,href,JSON.stringify({missionId:m.id,version:m.version})]);
}
@Injectable()
export class AutomationService {
  constructor(
    private readonly db: Database,
    private readonly documents: DocumentsService,
  ) {}
  async matches(id: string) {
    return this.db.transaction(async (em) => {
      const [e] = await em.query(
        "SELECT * FROM outbox WHERE id=$1 AND event IN('MissionOPEN','MatchRequested')",
        [id],
      );
      if (!e) throw new NotFoundException();
      const m = await lockMission(em, e.payload.missionId);
      const receipt = await em.query(
        "SELECT 1 FROM workflow_receipt WHERE event_id=$1 AND action='matches'",
        [id],
      );
      if (receipt.length) return { status: "ALREADY_PROCESSED" };
      let count = 0;
      if (
        m.status === "OPEN" &&
        m.version === e.payload.version &&
        new Date(m.start_at).getTime() > Date.now()
      ) {
        let cursor = "00000000-0000-0000-0000-000000000000";
        while (true) {
          const profiles = await em.query(
            "SELECT p.* FROM profile p JOIN account a ON a.id=p.user_id AND a.active WHERE p.visible AND p.notifications_enabled AND $1=ANY(p.qualifications) AND ($2::uuid IS NULL OR p.user_id=$2) AND p.user_id>$3::uuid ORDER BY p.user_id LIMIT 100 FOR UPDATE OF p FOR SHARE OF a",
            [m.qualification, e.payload.profileId ?? null, cursor],
          );
          if (!profiles.length) break;
          cursor = profiles[profiles.length - 1].user_id;
          for (const p of profiles) {
            const conflicts = await em.query(
              "SELECT start_at,end_at FROM assignment WHERE nurse_id=$1 AND status='ACTIVE'",
              [p.user_id],
            );
            if (
              match(
                professional(p, conflicts),
                matchingMission(m),
                await geodesicKm(em, p, m),
              ).eligible
            ) {
              await missionNotice(em,id,{user_id:p.user_id,role:"NURSE"},"MATCH",m);
              count++;
            }
          }
        }
      }
      await em.query(
        "INSERT INTO workflow_receipt(event_id,action) VALUES($1,'matches') ON CONFLICT DO NOTHING",
        [id],
      );
      return { status: "PROCESSED", notifications: count };
    });
  }
  async reminders() {
    const delay = Number(process.env.REMINDER_DELAY_MINUTES ?? 60);
    if (!Number.isFinite(delay) || delay < 0)
      throw new Error("Invalid reminder delay");
    let notifications = 0;
    while (true) {
      const batch = await this.db.transaction(async (em) => {
        const window = new Date().toISOString().slice(0, 13);
        const missions = await em.query(
          "SELECT * FROM mission WHERE status='OPEN' AND start_at>now() AND created_at<now()-make_interval(mins=>$1) AND NOT EXISTS(SELECT 1 FROM reminder_window w WHERE w.mission_id=mission.id AND w.version=mission.version AND w.window_key=$2) ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED",
          [Math.floor(delay), window],
        );
        let count = 0;
        for (const m of missions) {
          const [existing] = await em.query(
            "SELECT 1 FROM reminder_window WHERE mission_id=$1 AND version=$2 AND window_key=$3",
            [m.id, m.version, window],
          );
          if (existing) continue;
          const [e] = await em.query(
            "INSERT INTO outbox(event,payload,completed_at) VALUES('ReminderCreated',$1,now()) RETURNING id",
            [JSON.stringify({ missionId: m.id, version: m.version })],
          );
          const members = await em.query(
            "SELECT a.id AS user_id, CASE WHEN EXISTS(SELECT 1 FROM membership s WHERE s.user_id=a.id AND s.organization_id=$1 AND s.active) THEN 'AGENCY' ELSE 'ESTABLISHMENT' END AS role FROM account a WHERE a.active AND EXISTS(SELECT 1 FROM membership s WHERE s.user_id=a.id AND s.organization_id IN($1,$2) AND s.active) ORDER BY a.id FOR SHARE OF a",
            [m.agency_id, m.establishment_id],
          );
          for (const actor of members) {
            await missionNotice(em,e.id,actor,"REMINDER",m);
            count++;
          }
          await em.query(
            "INSERT INTO reminder_window(mission_id,version,window_key,event_id) VALUES($1,$2,$3,$4)",
            [m.id, m.version, window, e.id],
          );
          await em.query(
            "INSERT INTO workflow_receipt(event_id,action) VALUES($1,'reminder')",
            [e.id],
          );
        }
        return { selected: missions.length, notifications: count };
      });
      notifications += batch.notifications;
      if (batch.selected === 0) break;
    }
    return { status: "PROCESSED", notifications };
  }
  async confirmation(id: string) {
    const reservation = await this.db.transaction(async (em) => {
      const [e] = await em.query(
        "SELECT * FROM outbox WHERE id=$1 AND event='AssignmentCreated'",
        [id],
      );
      if (!e) throw new NotFoundException();
      const m = await lockMission(em, e.payload.missionId);
      const [a] = await em.query(
        "SELECT * FROM assignment WHERE id=$1 FOR UPDATE",
        [e.payload.assignmentId],
      );
      if (!a) throw new NotFoundException();
      await em.query(
        "INSERT INTO mission_confirmation(assignment_id,mission_version,status) VALUES($1,$2,'PENDING') ON CONFLICT DO NOTHING",
        [a.id, e.payload.version],
      );
      const [c] = await em.query(
        "SELECT * FROM mission_confirmation WHERE assignment_id=$1 AND mission_version=$2 FOR UPDATE",
        [a.id, e.payload.version],
      );
      if (
        !(
          (a.status === "ACTIVE" && m.status === "FILLED") ||
          (a.status === "COMPLETED" && m.status === "COMPLETED")
        ) ||
        m.version !== e.payload.version
      ) {
        await em.query(
          "UPDATE mission_confirmation SET status='CANCELLED' WHERE id=$1",
          [c.id],
        );
        await em.query(
          "INSERT INTO workflow_receipt(event_id,action) VALUES($1,'confirmation') ON CONFLICT DO NOTHING",
          [id],
        );
        return { done: true, status: "CANCELLED" };
      }
      if (c.status === "READY")
        return { done: true, status: "READY", documentId: c.document_id };
      if (c.lease_until && new Date(c.lease_until).getTime() > Date.now())
        throw new ConflictException("Confirmation generation in progress");
      await em.query(
        "UPDATE mission_confirmation SET status='PENDING',lease_until=now()+interval '2 minutes',lease_token=$2 WHERE id=$1",
        [c.id, (c.lease_token = randomUUID())],
      );
      return { done: false, m, a, c };
    });
    if (reservation.done) return reservation;
    const { m, a, c } = reservation;
    try {
      const pdf = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const chunks: Buffer[] = [];
        doc.on("data", (b) => chunks.push(b));
        doc.on("error", reject);
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.fontSize(20).text("InfiMatch - Confirmation de mission");
        doc
          .moveDown()
          .fontSize(11)
          .text(
            "DEMONSTRATION FICTIVE - Ceci ne constitue pas un contrat signe.",
          );
        doc
          .moveDown()
          .text("Modele 1 / Version mission " + m.version)
          .text("Mission : " + m.title)
          .text("Qualification : " + m.qualification)
          .text("Lieu : " + m.address)
          .text("Debut UTC : " + new Date(m.start_at).toISOString())
          .text("Fin UTC : " + new Date(m.end_at).toISOString())
          .text("Salaire brut : " + m.hourly_salary + " EUR / heure")
          .text("Reference affectation : " + a.id);
        doc.end();
      });
      const stored = await this.documents.store(
        a.nurse_id,
        "CONFIRMATION",
        "application/pdf",
        pdf,
        a.id,
      );
      return this.db.transaction(async (em) => {
        const current = await lockMission(em, m.id);
        const [assignment] = await em.query(
          "SELECT * FROM assignment WHERE id=$1 FOR UPDATE",
          [a.id],
        );
        const [reserved] = await em.query(
          "SELECT lease_token FROM mission_confirmation WHERE id=$1 FOR UPDATE",
          [c.id],
        );
        if (reserved.lease_token !== c.lease_token)
          throw new ConflictException("Confirmation lease superseded");
        const status =
          ((assignment.status === "ACTIVE" && current.status === "FILLED") ||
            (assignment.status === "COMPLETED" &&
              current.status === "COMPLETED")) &&
          current.version === m.version
            ? "READY"
            : "CANCELLED";
        await em.query(
          "UPDATE mission_confirmation SET status=$2,document_id=$3,lease_until=NULL WHERE id=$1",
          [c.id, status, stored.id],
        );
        if (status === "READY") {
          const recipients = await em.query(
            "SELECT a.id AS user_id, CASE WHEN a.id=$3::uuid THEN 'NURSE' WHEN EXISTS(SELECT 1 FROM membership s WHERE s.user_id=a.id AND s.organization_id=$1 AND s.active) THEN 'AGENCY' ELSE 'ESTABLISHMENT' END AS role FROM account a WHERE a.active AND (a.id=$3::uuid OR EXISTS(SELECT 1 FROM membership s WHERE s.user_id=a.id AND s.active AND s.organization_id IN($1,$2))) ORDER BY a.id FOR SHARE OF a",
            [m.agency_id, m.establishment_id, a.nurse_id],
          );
          for (const r of recipients)
            await missionNotice(em,id,r,"CONFIRMATION",m);
        }
        await em.query(
          "INSERT INTO workflow_receipt(event_id,action) VALUES($1,'confirmation') ON CONFLICT DO NOTHING",
          [id],
        );
        await audit(em, null, "CONFIRMATION_" + status, c.id);
        return { status, documentId: stored.id };
      });
    } catch (e) {
      await this.db.query(
        "UPDATE mission_confirmation SET status='FAILED',lease_until=NULL WHERE id=$1 AND status='PENDING' AND lease_token=$2",
        [c.id, c.lease_token],
      );
      throw e;
    }
  }
  async cancellation(id: string) {
    return this.db.transaction(async em => {
      const [e] = await em.query("SELECT * FROM outbox WHERE id=$1 AND event='MissionCANCELLED'", [id]);
      if (!e) throw new NotFoundException();
      const m = await lockMission(em, e.payload.missionId);
      const receipt = await em.query("SELECT 1 FROM workflow_receipt WHERE event_id=$1 AND action='cancellation'", [id]);
      if (receipt.length) return { status: "ALREADY_PROCESSED" };
      let count = 0;
      // No cancellation alert for an unpublished draft or a superseded mission version.
      if (m.status === "CANCELLED" && m.version === e.payload.version && ["OPEN", "FILLED"].includes(e.payload.previousStatus)) {
        const pending = await em.query("SELECT nurse_id FROM application WHERE mission_id=$1 AND status IN('SUBMITTED','SELECTED')",[m.id]);
        const nurses = [...new Set([...(e.payload.nurseIds ?? []), ...pending.map((a: any)=>a.nurse_id)])];
        const recipients = await em.query(
          "SELECT a.id AS user_id, CASE WHEN a.id=ANY($3::uuid[]) THEN 'NURSE' WHEN EXISTS(SELECT 1 FROM membership s WHERE s.user_id=a.id AND s.organization_id=$1 AND s.active) THEN 'AGENCY' ELSE 'ESTABLISHMENT' END AS role FROM account a WHERE a.active AND (a.id=ANY($3::uuid[]) OR EXISTS(SELECT 1 FROM membership s WHERE s.user_id=a.id AND s.active AND s.organization_id IN($1,$2))) ORDER BY a.id FOR SHARE OF a",
          [m.agency_id, m.establishment_id, nurses],
        );
        for (const recipient of recipients) {
          const inserted = await missionNotice(em,id,recipient,"CANCELLATION",m);
          count += inserted.length;
        }
      }
      await em.query("INSERT INTO workflow_receipt(event_id,action) VALUES($1,'cancellation') ON CONFLICT DO NOTHING", [id]);
      return { status: "PROCESSED", notifications: count };
    });
  }
  async dispatch(
    limit = 20,
    transport: typeof fetch = fetch,
    eventId: string | null = null,
  ) {
    const events = await this.db.transaction(async (em) => {
      const rows = await em.query(
        "SELECT * FROM outbox WHERE event IN('MissionOPEN','MatchRequested','AssignmentCreated','MissionCANCELLED') AND ($2::uuid IS NULL OR id=$2) AND completed_at IS NULL AND attempts<5 AND available_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY CASE WHEN event='AssignmentCreated' THEN 0 ELSE 1 END,created_at,id LIMIT $1 FOR UPDATE SKIP LOCKED",
        [limit, eventId],
      );
      for (const row of rows) {
        row.token = randomUUID();
        await em.query(
          "UPDATE outbox SET attempts=attempts+1,lease_until=now()+interval '90 seconds',lease_token=$2 WHERE id=$1",
          [row.id, row.token],
        );
      }
      return rows;
    });
    const results = [];
    for (const e of events) {
      const action =
        e.event === "MissionCANCELLED" ? "cancellation" : e.event === "AssignmentCreated" ? "confirmation" : "matches";
      try {
        const response = await transport(
          required("N8N_WEBHOOK_BASE") + "/" + action,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-InfiMatch-Token": required("SERVICE_TOKEN"),
            },
            body: JSON.stringify({ eventId: e.id }),
            signal: AbortSignal.timeout(60000),
          },
        );
        const [receipt] = await this.db.query(
          "SELECT 1 FROM workflow_receipt WHERE event_id=$1 AND action=$2",
          [e.id, action],
        );
        if (!response.ok || !receipt) throw new Error("FINAL_RECEIPT_MISSING");
        await this.db.query(
          "UPDATE outbox SET completed_at=now(),lease_until=NULL,last_error=NULL WHERE id=$1 AND lease_token=$2",
          [e.id, e.token],
        );
        results.push({ id: e.id, status: "COMPLETED" });
      } catch {
        await this.db.query(
          "UPDATE outbox SET lease_until=NULL,available_at=now()+interval '30 seconds'*power(2,attempts-1),last_error='DELIVERY_OR_RECEIPT_FAILED' WHERE id=$1 AND lease_token=$2",
          [e.id, e.token],
        );
        results.push({
          id: e.id,
          status: e.attempts + 1 >= 5 ? "EXHAUSTED" : "RETRY_PENDING",
        });
      }
    }
    return results;
  }
}
@Controller("internal/automation")
@UseInterceptors(ExecutionTrace)
class AutomationController {
  constructor(private readonly service: AutomationService) {}
  private authorize(token: string) {
    const expected = required("SERVICE_TOKEN");
    if (
      typeof token !== "string" ||
      Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    )
      throw new UnauthorizedException();
  }
  @Post("matches/:id") matches(
    @Headers("x-infimatch-token") token: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    this.authorize(token);
    return this.service.matches(id);
  }
  @Post("reminders") reminders(@Headers("x-infimatch-token") token: string) {
    this.authorize(token);
    return this.service.reminders();
  }
  @Post("cancellation/:id") cancellation(
    @Headers("x-infimatch-token") token: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    this.authorize(token);
    return this.service.cancellation(id);
  }
  @Post("confirmation/:id") confirmation(
    @Headers("x-infimatch-token") token: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    this.authorize(token);
    return this.service.confirmation(id);
  }
}
@Module({
  imports: [DocumentsModule],
  controllers: [AutomationController],
  providers: [AutomationService,ExecutionTrace],
  exports: [AutomationService],
})
export class AutomationModule {}

export async function retryOutbox(db: Database, id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new Error("Invalid event UUID");
  return db.transaction(async (em) => {
    const [row] = await em.query(
      "SELECT * FROM outbox WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (
      !row ||
      !["MissionOPEN", "MatchRequested", "AssignmentCreated", "MissionCANCELLED"].includes(
        row.event,
      )
    )
      throw new Error("Retryable event not found");
    if (row.completed_at) return { id, status: "ALREADY_COMPLETED" };
    if (row.lease_until && new Date(row.lease_until).getTime() > Date.now())
      throw new Error("Event still reserved by worker");
    await em.query(
      "UPDATE outbox SET attempts=0,available_at=now(),lease_until=NULL,lease_token=NULL,last_error=NULL WHERE id=$1",
      [id],
    );
    await audit(em, null, "OUTBOX_REQUEUED", id, {
      previousAttempts: row.attempts,
    });
    return { id, status: "QUEUED" };
  });
}
