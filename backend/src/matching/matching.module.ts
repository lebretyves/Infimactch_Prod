import { MATCH_RULES } from "../domain/rules";
import { geodesicKm } from "../database/distance";
import { PageDto } from "../common/page.dto";
import {
  Controller,
  Get,
  Req,
  Param,
  Query,
  Module,
  Injectable,
  OnModuleDestroy,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import mongoose from "mongoose";
import { Request } from "express";
import { Database } from "../database/database";
import { SessionGuard, user } from "../common/access";
import { required } from "../config";
import {
  missionSelect,
  matchingMission,
  scope,
} from "../missions/missions.service";
import { professional } from "../profiles/profiles.module";
import { match } from "../domain/matching";
const runSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true },
    missionId: { type: String, required: true },
    profileVersion: { type: String, required: true },
    missionVersion: { type: Number, required: true },
    missionStatus: { type: String, required: true },
    rulesVersion: { type: String, required: true },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, strict: "throw" },
);
runSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
runSchema.index({ ownerId: 1, missionId: 1 });
@Injectable()
export class MatchingService implements OnModuleDestroy {
  readonly connection = mongoose.createConnection(required("MONGODB_URI"), {
    serverSelectionTimeoutMS: 2000,
  });
  readonly runs = this.connection.model("MatchingRun", runSchema);
  private readonly retentionDays = Number(
    process.env.MATCHING_RETENTION_DAYS ?? 30,
  );
  constructor(private readonly db: Database) {
    if (
      !Number.isInteger(this.retentionDays) ||
      this.retentionDays < 1 ||
      this.retentionDays > 365
    )
      throw new Error("Invalid matching retention");
    this.connection.on("error", () => {});
  }
  async ready() {
    await this.connection.asPromise();
    if (this.connection.readyState !== 1)
      throw new Error("MONGO_NOT_CONNECTED");
    await this.runs.init();
  }
  async onModuleDestroy() {
    await this.connection.close();
  }
  async calculate(owner: string, m: any, p: any, conflicts: any[]) {
    const result = match(
      professional(p, conflicts),
      matchingMission(m),
      await geodesicKm(this.db, p, m),
    );
    try {
      await this.ready();
      const run = await this.runs.create({
        ownerId: owner,
        missionId: m.id,
        profileVersion:
          new Date(p.updated_at).toISOString() + ":" + p.rpps_version,
        missionVersion: m.version,
        missionStatus: m.status,
        rulesVersion: MATCH_RULES.version,
        result,
        expiresAt: new Date(Date.now() + this.retentionDays * 86400000),
      });
      return {
        ...result,
        missionId: m.id,
        explanationId: String(run._id),
        historyStatus: "SAVED",
      };
    } catch {
      await this.db.query(
        "INSERT INTO audit(actor_id,event,resource_id) VALUES($1,'MATCHING_HISTORY_UNAVAILABLE',$2)",
        [owner, m.id],
      );
      return {
        ...result,
        missionId: m.id,
        explanationId: null,
        historyStatus: "UNAVAILABLE",
      };
    }
  }
  async forNurse(actor: string, page: PageDto = new PageDto()) {
    const [p] = await this.db.query("SELECT * FROM profile WHERE user_id=$1", [
      actor,
    ]);
    if (!p) throw new NotFoundException();
    const conflicts = await this.db.query(
      "SELECT start_at,end_at FROM assignment WHERE nurse_id=$1 AND status='ACTIVE'",
      [actor],
    );
    let cursor = "00000000-0000-0000-0000-000000000000",
      scanned = 0,
      excluded = 0;
    const top: any[] = [];
    const compare = (a: any, b: any) =>
      (b.result.score ?? -1) - (a.result.score ?? -1) ||
      new Date(a.m.start_at).getTime() - new Date(b.m.start_at).getTime() ||
      a.m.id.localeCompare(b.m.id);
    while (true) {
      const batch = await this.db.query(
        missionSelect +
          " WHERE m.status='OPEN' AND m.start_at>now() AND m.qualification=ANY($1) AND m.id>$2::uuid ORDER BY m.id LIMIT 100",
        [p.qualifications, cursor],
      );
      if (!batch.length) break;
      for (const m of batch) {
        const result = match(
          professional(p, conflicts),
          matchingMission(m),
          await geodesicKm(this.db, p, m),
        );
        if (!result.eligible) {
          excluded++;
          continue;
        }
        top.push({ m, result });
        top.sort(compare);
        if (top.length > page.offset + page.limit) top.pop();
        scanned++;
      }
      cursor = batch[batch.length - 1].id;
    }
    const items = [];
    for (const item of top.slice(page.offset))
      items.push(await this.calculate(actor, item.m, p, conflicts));
    return {
      items,
      limit: page.limit,
      offset: page.offset,
      total: scanned,
      excluded,
      rppsStatus: p.rpps_status,
    };
  }
  async forMission(actor: string, id: string, page: PageDto = new PageDto()) {
    const m = await this.db.transaction(async (em) => {
      const [m] = await em.query(missionSelect + " WHERE m.id=$1", [id]);
      if (!m) throw new NotFoundException();
      await scope(em, actor, m);
      return m;
    });
    let cursor = "00000000-0000-0000-0000-000000000000",
      scanned = 0,
      excluded = 0;
    const top: any[] = [];
    while (true) {
      const batch = await this.db.query(
        "SELECT * FROM profile WHERE visible AND $1=ANY(qualifications) AND user_id>$2::uuid ORDER BY user_id LIMIT 100",
        [m.qualification, cursor],
      );
      if (!batch.length) break;
      for (const p of batch) {
        const conflicts = await this.db.query(
          "SELECT start_at,end_at FROM assignment WHERE nurse_id=$1 AND status='ACTIVE'",
          [p.user_id],
        );
        const result = match(
          professional(p, conflicts),
          matchingMission(m),
          await geodesicKm(this.db, p, m),
        );
        if (!result.eligible || new Date(m.start_at).getTime() <= Date.now()) {
          excluded++;
          continue;
        }
        top.push({
          candidateId: p.user_id,
          qualifications: p.qualifications,
          skills: p.skills,
          ...result,
        });
        top.sort(
          (a, b) =>
            (b.score ?? -1) - (a.score ?? -1) ||
            a.candidateId.localeCompare(b.candidateId),
        );
        if (top.length > page.offset + page.limit) top.pop();
        scanned++;
      }
      cursor = batch[batch.length - 1].user_id;
    }
    return {
      items: top.slice(page.offset),
      limit: page.limit,
      offset: page.offset,
      total: scanned,
      excluded,
    };
  }
  async explanation(actor: string, id: string) {
    if (!mongoose.isObjectIdOrHexString(id)) throw new NotFoundException();
    let run: any;
    try {
      await this.ready();
      run = await this.runs
        .findOne({ _id: id, ownerId: actor, expiresAt: { $gt: new Date() } })
        .lean();
    } catch {
      throw new ServiceUnavailableException("Explanation history unavailable");
    }
    if (!run) throw new NotFoundException();
    const [current] = await this.db.query(
      "SELECT p.updated_at,p.rpps_version,m.version,m.status,m.end_at FROM profile p CROSS JOIN mission m WHERE p.user_id=$1 AND m.id=$2",
      [actor, run.missionId],
    );
    const stale =
      !current ||
      run.rulesVersion !== MATCH_RULES.version ||
      run.missionStatus !== current.status ||
      new Date(current.end_at).getTime() <= Date.now() ||
      run.profileVersion !==
        new Date(current.updated_at).toISOString() +
          ":" +
          current.rpps_version ||
      run.missionVersion !== current.version;
    return { ...run, stale, notice: stale ? "RECALCULATE_REQUIRED" : null };
  }
}
@Controller()
@UseGuards(SessionGuard)
class MatchingController {
  constructor(private readonly service: MatchingService) {}
  @Get("me/matches") matches(@Req() r: Request, @Query() page: PageDto) {
    return this.service.forNurse(user(r), page);
  }
  @Get("missions/:id/candidates") candidates(
    @Req() r: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() page: PageDto,
  ) {
    return this.service.forMission(user(r), id, page);
  }
  @Get("matches/:id/explanation") explanation(
    @Req() r: Request,
    @Param("id") id: string,
  ) {
    return this.service.explanation(user(r), id);
  }
}
@Module({
  providers: [MatchingService],
  controllers: [MatchingController],
  exports: [MatchingService],
})
export class MatchingModule {}
