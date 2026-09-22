import { listingPageQuery } from "./listing-page";
import {ConversionController,ConversionService} from './conversions';
import {rankedListingPage} from './listing-order';
import {LocationsController} from './locations';
import {ReverseLocationController} from './reverse-location';
import {RecommendationsController} from './recommendations';
import {MatchingModule} from '../matching/matching.module';
import { partialOfferMatch } from "../public-data/partial-matching";
import { professional } from "../profiles/profile-mapping";
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
import { ExternalListingsDto, SearchDto, searchSql } from "./search";
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
export class ListingsController {
  constructor(private readonly db: Database) {}
  @ApiOperation({
    description:
      "Paginated results include total, limit and offset. total counts the same filtered catalogue as items. External offers expose correspondence (EXTERNAL_CRITERIA), score=null, eligibilityVerified=false, provider-reported criteria and quality warnings. Unknown fields never prove eligibility; applicationMode=REDIRECT. Authenticated search also adds profileCorrespondence; includeUncertainExternal defaults false and unverifiedSearchFilters identifies filters not satisfied by evidence.",
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
    b.origine ??= 'toutes';
    b.sort ??= 'relevance';
    // Browsing a public mission does not grant eligibility or the right to apply.
    const generalBrowse=!p.qualifications.length && !b.qualifications.length;
    if(generalBrowse) b.qualifications=['IDE','IADE','IBODE'];
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
      b.shifts?.length ||
      b.establishmentId,
    );
    const externalWhere =
      strictUnknown && !b.includeUncertainExternal
        ? "false"
        : "e.active AND (e.expires_at IS NULL OR e.expires_at>now()) AND (e.qualification=ANY(" +
          bind(
            b.includeUncertainExternal
              ? b.qualifications
              : externalQualifications,
          ) +
          ")" + (generalBrowse ? " OR e.qualification IS NULL)" : ")");
    let externalRadius='';
    if(b.radiusKm!==undefined){
      const lat="e.provenance#>'{facts,location,coordinates,latitude}'",lon="e.provenance#>'{facts,location,coordinates,longitude}'";
      const latValue="(e.provenance#>>'{facts,location,coordinates,latitude}')::double precision",lonValue="(e.provenance#>>'{facts,location,coordinates,longitude}')::double precision";
      // CASE prevents casts of untrusted text; unknown coordinates never prove distance.
      externalRadius=" AND CASE WHEN jsonb_typeof("+lat+")='number' AND jsonb_typeof("+lon+")='number' THEN CASE WHEN "+latValue.replace("::double precision","::numeric")+" BETWEEN -90 AND 90 AND "+lonValue.replace("::double precision","::numeric")+" BETWEEN -180 AND 180 THEN ST_DWithin(ST_SetSRID(ST_MakePoint("+lonValue+","+latValue+"),4326)::geography,ST_SetSRID(ST_MakePoint("+bind(b.longitude)+","+bind(b.latitude)+"),4326)::geography,"+bind(b.radiusKm*1000)+") ELSE false END ELSE false END";
    }
    const sourceSql =
      "SELECT 'm_'||m.id AS listing_id,m.created_at AS listed_at,(to_jsonb(m)-'location')||jsonb_build_object('id','m_'||m.id,'kind','INTERNAL_MISSION','publicationDate',COALESCE((SELECT min(a.created_at) FROM audit a WHERE a.resource_id=m.id AND a.event='MISSION_OPEN'),m.created_at),'latitude',ST_Y(m.location::geometry),'longitude',ST_X(m.location::geometry),'salary',jsonb_build_object('amount',m.hourly_salary,'currency','EUR','unit','HOUR','gross',true)) AS data FROM mission m WHERE " +
      (q.where + (b.origine==='externes' ? ' AND false' : '')) +
      " UNION ALL SELECT 'e_'||e.id,e.imported_at,(to_jsonb(e)-'raw_hash')||jsonb_build_object('id','e_'||e.id,'kind','EXTERNAL_OFFER','applicationMode','REDIRECT','eligibility','INCOMPLETE') FROM external_offer e WHERE " +
      (externalWhere + externalRadius + (b.origine==='partenaires' ? ' AND false' : ''));
    const pageResult = await rankedListingPage(this.db, sourceSql, parameters, b, p);
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
      total: pageResult.total,
      items: pageResult.items.map((data: any) =>
        data.kind === "EXTERNAL_OFFER"
          ? {
              ...externalPresentation(data),
              profileCorrespondence: partialOfferMatch(
                data,
                professional(p),
                comparedAt,
              ),
              unverifiedSearchFilters,
              requestedFiltersVerified: unverifiedSearchFilters.length === 0,
            }
          : data,
      ),
      limit: b.limit ?? 20,
      offset: b.offset ?? 0,
      externalDistance: b.radiusKm===undefined ? null : {basis:'PROVIDER_COORDINATES_OR_COMMUNE_CENTRE',approximate:true,unknownCoordinatesExcluded:true},
      unknownExternalFieldsExcluded:
        !b.includeUncertainExternal &&
        (strictUnknown || b.radiusKm !== undefined ||
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
      "Paginated results include total, limit and offset. total counts the same filtered catalogue as items. External offers expose correspondence (EXTERNAL_CRITERIA), score=null, eligibilityVerified=false, provider-reported criteria and quality warnings. Unknown fields never prove eligibility; applicationMode=REDIRECT.",
  })
  @Get("listings/external")
  async external(@Query() page: ExternalListingsDto) {
    const query = listingPageQuery(
      "SELECT e.id::text AS listing_id,e.imported_at AS listed_at,jsonb_build_object('id',e.id,'source',e.source,'source_id',e.source_id,'title',e.title,'description',e.description,'url',e.url,'location_label',e.location_label,'qualification',e.qualification,'imported_at',e.imported_at,'expires_at',e.expires_at,'provenance',e.provenance,'parsed_offer',e.parsed_offer) AS data FROM external_offer e WHERE e.active AND (e.expires_at IS NULL OR e.expires_at>now())",
      [], page,
    );
    const [result] = await this.db.query(query.sql, query.parameters);
    return {
      total: result.total,
      limit: page.limit,
      offset: page.offset,
      items: result.items.map((e: any) =>
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
    const organizations = await this.db.query(
      "SELECT id,name FROM organization WHERE id IN($1,$2)",
      [m.agency_id, m.establishment_id],
    );
    return {
      ...m,
      id,
      kind: "INTERNAL_MISSION",
      establishment_name: organizations.find((o) => o.id === m.establishment_id)
        ?.name,
      agency_name: organizations.find((o) => o.id === m.agency_id)?.name,
    };
  }
  @Get("facilities") async facilities(@Query() page: PageDto) {
    return this.db.query(
      "SELECT id,name,address,finess FROM organization WHERE kind='ESTABLISHMENT' ORDER BY name,id LIMIT $1 OFFSET $2",
      [page.limit, page.offset],
    );
  }
  @Get("facilities/:id") async facility(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() page: PageDto,
  ) {
    const [facility] = await this.db.query(
      "SELECT id,name,address,finess FROM organization WHERE id=$1 AND kind='ESTABLISHMENT'",
      [id],
    );
    if (!facility) throw new NotFoundException();
    const missions = await this.db.query(
      missionSelect +
        " WHERE m.establishment_id=$1 AND m.status='OPEN' AND m.start_at>now() ORDER BY m.start_at,m.id LIMIT $2 OFFSET $3",
      [id, page.limit, page.offset],
    );
    return { ...facility, missions };
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
      `SELECT a.*,m.title,m.timezone,m.address,e.name AS establishment_name,CASE WHEN now()<a.start_at THEN 'upcoming' WHEN now()<a.end_at THEN 'in_progress' ELSE 'past' END AS temporal_position FROM assignment a JOIN mission m ON m.id=a.mission_id JOIN organization e ON e.id=m.establishment_id WHERE a.nurse_id=$1 ORDER BY a.start_at DESC,a.id LIMIT $2 OFFSET $3`,
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
    const [activity] = await this.db.query(`SELECT
      (SELECT count(*) FROM staffing_request s WHERE EXISTS(SELECT 1 FROM membership o WHERE o.user_id=$1 AND o.active AND (o.organization_id=s.establishment_id OR EXISTS(SELECT 1 FROM agency_link l WHERE l.agency_id=o.organization_id AND l.establishment_id=s.establishment_id))))::int AS needs,
      (SELECT count(*) FROM application a JOIN mission m ON m.id=a.mission_id WHERE a.status IN('SUBMITTED','SELECTED') AND EXISTS(SELECT 1 FROM membership o WHERE o.user_id=$1 AND o.active AND o.organization_id IN(m.agency_id,m.establishment_id)))::int AS applications`,[user(r)]);
    const recentNeeds=await this.db.query("SELECT s.id,s.title,s.created_at,(SELECT count(*)::int FROM mission m WHERE m.staffing_request_id=s.id AND EXISTS(SELECT 1 FROM membership z WHERE z.user_id=$1 AND z.active AND z.organization_id IN(m.agency_id,m.establishment_id))) AS mission_count FROM staffing_request s WHERE EXISTS(SELECT 1 FROM membership o WHERE o.user_id=$1 AND o.active AND (o.organization_id=s.establishment_id OR EXISTS(SELECT 1 FROM agency_link l WHERE l.agency_id=o.organization_id AND l.establishment_id=s.establishment_id))) ORDER BY s.created_at DESC,s.id LIMIT 5",[user(r)]);
    const recentMissions=await this.db.query("SELECT m.id,m.title,m.status,m.start_at,m.end_at,m.timezone,(SELECT count(*)::int FROM application a WHERE a.mission_id=m.id AND a.status IN('SUBMITTED','SELECTED')) AS application_count FROM mission m WHERE EXISTS(SELECT 1 FROM membership o WHERE o.user_id=$1 AND o.active AND o.organization_id IN(m.agency_id,m.establishment_id)) ORDER BY m.created_at DESC,m.id LIMIT 5",[user(r)]);
    return {
      family: "ENTERPRISE",
      activity,recentNeeds,recentMissions,
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
@Module({ imports:[MatchingModule], controllers: [ReverseLocationController,LocationsController,ListingsController,RecommendationsController,ConversionController], providers:[ConversionService] })
export class ListingsModule {}
