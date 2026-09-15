import { partialOfferMatch } from "../public-data/partial-matching";
import { professional } from "../profiles/profiles.module";
import { PageDto } from "../common/page.dto";
import { Query } from "@nestjs/common";
import { ApiOperation, ApiProperty } from "@nestjs/swagger";
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Req,
  Param,
  Module,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { IsIn, IsUUID } from "class-validator";
import { Request } from "express";
import { Database } from "../database/database";
import { SessionGuard, user, nurse } from "../common/access";
import { missionSelect } from "../missions/missions.service";
import { SearchDto, searchSql } from "./search";
import { externalPresentation } from "../public-data/offer-quality";
class FavoriteDto {
  @ApiProperty({
    type: () => String,
    required: true,
    enum: ["MISSION", "EXTERNAL", "ESTABLISHMENT"],
  })
  @IsIn(["MISSION", "EXTERNAL", "ESTABLISHMENT"])
  kind!: string;
  @ApiProperty({ type: () => String, required: true })
  @IsUUID()
  targetId!: string;
}
@Controller()
class ListingsController {
  constructor(private readonly db: Database) {}
  @ApiOperation({
    description:
      "External offers expose correspondence (EXTERNAL_CRITERIA), score=null, eligibilityVerified=false, provider-reported criteria and quality warnings. Unknown fields never prove eligibility; applicationMode=REDIRECT. Authenticated search also adds profileCorrespondence; includeUncertainExternal defaults false and unverifiedSearchFilters identifies filters not satisfied by evidence.",
  })
  @Post("listings/search")
  @UseGuards(SessionGuard)
  async search(@Req() r: Request, @Body() b: SearchDto) {
    const [p] = await this.db.query("SELECT * FROM profile WHERE user_id=$1", [
      user(r),
    ]);
    if (!p) throw new NotFoundException();
    if (b.qualifications.some((q) => !p.qualifications.includes(q)))
      throw new BadRequestException("Qualification not held");
    const q = searchSql(b);
    const parameters = [...q.parameters];
    const bind = (value: unknown) => {
      parameters.push(value);
      return "$" + parameters.length;
    };
    const externalQualifications = b.qualifications.filter((qualification) => {
      if (qualification === "IDE") return !b.ideServices?.length;
      const prefix = qualification.toLowerCase();
      return !["Population", "Blocks", "Specialties"].some(
        (s) => (b as any)[prefix + s]?.length,
      );
    });
    const strictUnknown = Boolean(
      b.start ||
      b.end ||
      b.radiusKm !== undefined ||
      b.shifts?.length ||
      b.establishmentId,
    );
    const externalWhere =
      strictUnknown && !b.includeUncertainExternal
        ? "false"
        : "e.active AND (e.expires_at IS NULL OR e.expires_at>now()) AND e.qualification=ANY(" +
          bind(
            b.includeUncertainExternal
              ? b.qualifications
              : externalQualifications,
          ) +
          ")";
    const sql =
      "SELECT data FROM (SELECT 'm_'||m.id AS listing_id,m.created_at AS listed_at,(to_jsonb(m)-'location')||jsonb_build_object('id','m_'||m.id,'kind','INTERNAL_MISSION','latitude',ST_Y(m.location::geometry),'longitude',ST_X(m.location::geometry),'salary',jsonb_build_object('amount',m.hourly_salary,'currency','EUR','unit','HOUR','gross',true)) AS data FROM mission m WHERE " +
      q.where +
      " UNION ALL SELECT 'e_'||e.id,e.imported_at,(to_jsonb(e)-'raw_hash')||jsonb_build_object('id','e_'||e.id,'kind','EXTERNAL_OFFER','applicationMode','REDIRECT','eligibility','INCOMPLETE') FROM external_offer e WHERE " +
      externalWhere +
      ") listings ORDER BY listed_at DESC,listing_id LIMIT " +
      bind(b.limit ?? 20) +
      " OFFSET " +
      bind(b.offset ?? 0);
    const rows = await this.db.query(sql, parameters);
    const unverifiedSearchFilters = [
      "start",
      "end",
      "radiusKm",
      "shifts",
      "establishmentId",
      "ideServices",
      "iadePopulation",
      "iadeBlocks",
      "iadeSpecialties",
      "ibodePopulation",
      "ibodeBlocks",
      "ibodeSpecialties",
    ].filter((key) => {
      const value = (b as any)[key];
      return Array.isArray(value) ? value.length > 0 : value !== undefined;
    });
    const comparedAt = new Date().toISOString();
    return {
      items: rows.map((r) =>
        r.data.kind === "EXTERNAL_OFFER"
          ? {
              ...externalPresentation(r.data),
              profileCorrespondence: partialOfferMatch(
                r.data,
                professional(p),
                comparedAt,
              ),
              unverifiedSearchFilters,
              requestedFiltersVerified: unverifiedSearchFilters.length === 0,
            }
          : r.data,
      ),
      limit: b.limit ?? 20,
      offset: b.offset ?? 0,
      unknownExternalFieldsExcluded:
        !b.includeUncertainExternal &&
        (strictUnknown ||
          externalQualifications.length !== b.qualifications.length),
    };
  }
  @Get("me/listings/:id/correspondence")
  @UseGuards(SessionGuard)
  @ApiOperation({
    description:
      "Private partial comparison against the authenticated nurse profile. No full score or verified eligibility. Public listing endpoints never expose profile comparisons.",
  })
  async compareExternal(@Req() r: Request, @Param("id") id: string) {
    if (
      !/^e_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      throw new NotFoundException();
    const [p] = await this.db.query("SELECT * FROM profile WHERE user_id=$1", [
      user(r),
    ]);
    if (!p) throw new NotFoundException();
    const [offer] = await this.db.query(
      "SELECT title,provenance FROM external_offer WHERE id=$1 AND active AND (expires_at IS NULL OR expires_at>now())",
      [id.slice(2)],
    );
    if (!offer) throw new NotFoundException();
    return {
      id,
      profileCorrespondence: partialOfferMatch(offer, professional(p)),
    };
  }
  @ApiOperation({
    description:
      "External offers expose correspondence (EXTERNAL_CRITERIA), score=null, eligibilityVerified=false, provider-reported criteria and quality warnings. Unknown fields never prove eligibility; applicationMode=REDIRECT.",
  })
  @Get("listings/external")
  async external(@Query() page: PageDto) {
    return {
      items: (
        await this.db.query(
          "SELECT id,source,source_id,title,description,url,location_label,qualification,imported_at,expires_at,provenance FROM external_offer WHERE active AND (expires_at IS NULL OR expires_at>now()) ORDER BY imported_at DESC,id LIMIT $1 OFFSET $2",
          [page.limit, page.offset],
        )
      ).map((e) =>
        externalPresentation({
          ...e,
          id: "e_" + e.id,
          kind: "EXTERNAL_OFFER",
          applicationMode: "REDIRECT",
          eligibility: "INCOMPLETE",
        }),
      ),
    };
  }
  @ApiOperation({
    description:
      "External offers expose correspondence (EXTERNAL_CRITERIA), score=null, eligibilityVerified=false, provider-reported criteria and quality warnings. Unknown fields never prove eligibility; applicationMode=REDIRECT.",
  })
  @Get("listings/:id")
  async detail(@Param("id") id: string) {
    if (
      !/^[me]_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      throw new NotFoundException();
    if (id.startsWith("e_")) {
      const [e] = await this.db.query(
        "SELECT * FROM external_offer WHERE id=$1",
        [id.slice(2)],
      );
      if (!e) throw new NotFoundException();
      return externalPresentation({ ...e, id });
    }
    const [m] = await this.db.query(
      missionSelect +
        " WHERE m.id=$1 AND m.status IN('OPEN','FILLED','COMPLETED','CANCELLED')",
      [id.slice(2)],
    );
    if (!m) throw new NotFoundException();
    return { ...m, id, kind: "INTERNAL_MISSION" };
  }
  @Get("facilities") async facilities(@Query() page: PageDto) {
    return this.db.query(
      "SELECT id,name,address,finess FROM organization WHERE kind='ESTABLISHMENT' ORDER BY name,id LIMIT $1 OFFSET $2",
      [page.limit, page.offset],
    );
  }
  @Post("me/favorites")
  @UseGuards(SessionGuard)
  async favorite(@Req() r: Request, @Body() b: FavoriteDto) {
    return this.db.transaction(async (em) => {
      await nurse(em, user(r));
      const sql = {
        MISSION: "SELECT id FROM mission WHERE id=$1 AND status!='DRAFT'",
        EXTERNAL: "SELECT id FROM external_offer WHERE id=$1",
        ESTABLISHMENT:
          "SELECT id FROM organization WHERE id=$1 AND kind='ESTABLISHMENT'",
      }[b.kind];
      if (!sql || (await em.query(sql, [b.targetId])).length === 0)
        throw new NotFoundException();
      await em.query(
        "INSERT INTO favorite(user_id,kind,target_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [user(r), b.kind, b.targetId],
      );
      return { ok: true };
    });
  }
  @Get("me/favorites")
  @UseGuards(SessionGuard)
  async favorites(@Req() r: Request, @Query() page: PageDto) {
    return this.db.query(
      `SELECT f.kind,f.target_id,COALESCE(m.title,e.title,o.name) AS title,m.status,e.expires_at,e.active FROM favorite f LEFT JOIN mission m ON f.kind='MISSION' AND m.id=f.target_id LEFT JOIN external_offer e ON f.kind='EXTERNAL' AND e.id=f.target_id LEFT JOIN organization o ON f.kind='ESTABLISHMENT' AND o.id=f.target_id WHERE f.user_id=$1 ORDER BY f.created_at DESC,f.target_id,f.kind LIMIT $2 OFFSET $3`,
      [user(r), page.limit, page.offset],
    );
  }
  @Delete("me/favorites/:kind/:id")
  @UseGuards(SessionGuard)
  async remove(
    @Req() r: Request,
    @Param("kind") kind: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.db.query(
      "DELETE FROM favorite WHERE user_id=$1 AND kind=$2 AND target_id=$3",
      [user(r), kind, id],
    );
    return { ok: true };
  }
  @Get("me/history")
  @UseGuards(SessionGuard)
  async history(@Req() r: Request, @Query() page: PageDto) {
    return this.db.query(
      `SELECT a.*,m.title,CASE WHEN now()<a.start_at THEN 'upcoming' WHEN now()<a.end_at THEN 'in_progress' ELSE 'past' END AS temporal_position FROM assignment a JOIN mission m ON m.id=a.mission_id WHERE a.nurse_id=$1 ORDER BY a.start_at DESC,a.id LIMIT $2 OFFSET $3`,
      [user(r), page.limit, page.offset],
    );
  }
  @Get("dashboards")
  @UseGuards(SessionGuard)
  async dashboard(@Req() r: Request) {
    if (r.session.family === "NURSE") {
      const [p] = await this.db.query(
        "SELECT display_name,rpps_status,available FROM profile WHERE user_id=$1",
        [user(r)],
      );
      const [counts] = await this.db.query(
        "SELECT (SELECT count(*) FROM favorite WHERE user_id=$1) AS favorites,(SELECT count(*) FROM application WHERE nurse_id=$1) AS applications,(SELECT count(*) FROM assignment WHERE nurse_id=$1) AS assignments",
        [user(r)],
      );
      return { family: "NURSE", profile: p, counts };
    }
    const counts = await this.db.query(
      "SELECT m.status,count(*) FROM mission m WHERE EXISTS(SELECT 1 FROM membership o WHERE o.user_id=$1 AND o.active AND o.organization_id IN(m.agency_id,m.establishment_id)) GROUP BY m.status",
      [user(r)],
    );
    return {
      family: "ENTERPRISE",
      counts: Object.fromEntries(
        ["DRAFT", "OPEN", "FILLED", "COMPLETED", "CANCELLED"].map((s) => [
          s,
          Number(counts.find((c) => c.status === s)?.count ?? 0),
        ]),
      ),
    };
  }
  @Get("me/notifications") @UseGuards(SessionGuard) notifications(
    @Req() r: Request,
    @Query() page: PageDto,
  ) {
    return this.db.query(
      "SELECT * FROM notification WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT $2 OFFSET $3",
      [user(r), page.limit, page.offset],
    );
  }
  @Post("me/notifications/:id/read") @UseGuards(SessionGuard) async read(
    @Req() r: Request,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const rows = await this.db.query(
      "UPDATE notification SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING id",
      [id, user(r)],
    );
    if (!rows.length) throw new NotFoundException();
    return { ok: true };
  }
}
@Module({ controllers: [ListingsController] })
export class ListingsModule {}
