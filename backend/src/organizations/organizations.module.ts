import {AgencyEstablishmentsController, AgencyEstablishmentsService} from './agency-establishments';
import { establishmentPage, EstablishmentsPageDto } from "./establishment-directory";
import { NeedDto, normalizeNeedDetails } from "./need.dto";
import { commandReceipt } from "../common/idempotency";
import { Headers } from "@nestjs/common";
import { PageDto } from "../common/page.dto";
import { Query } from "@nestjs/common";
import { FINESS_PATTERN } from "../reference-data/finess";
import { ApiProperty } from "@nestjs/swagger";
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  Param,
  Module,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  IsString,
  IsOptional,
  Matches,
  Length,
  IsBoolean,
} from "class-validator";
import { Request } from "express";
import { Database, audit } from "../database/database";
import { SessionGuard, user, member, nurse } from "../common/access";
class OrganizationDto {
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  @Length(2, 150)
  name!: string;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  @Length(5, 500)
  address!: string;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  @Length(2, 150)
  referent!: string;
  @ApiProperty({ type: () => String, required: false })
  @IsOptional()
  @Matches(FINESS_PATTERN)
  finess?: string;
  @ApiProperty({ type: () => String, required: false })
  @IsOptional()
  @Matches(/^\d{14}$/)
  siret?: string;
}
class NotificationDto {
  @ApiProperty({ type: () => Boolean, required: true })
  @IsBoolean()
  enabled!: boolean;
}
@Controller()
@UseGuards(SessionGuard)
class OrganizationsController {
  constructor(private readonly db: Database) {}
  @Get("me/establishments") directory(@Req() r: Request, @Query() page: EstablishmentsPageDto) {
    return establishmentPage(this.db, user(r), page);
  }
  @Get("me/organizations") async own(@Req() r: Request) {
    const organizations = await this.db.query(
      "SELECT o.*,f.latitude,f.longitude FROM organization o JOIN membership m ON m.organization_id=o.id LEFT JOIN finess_establishment f ON f.finess=o.finess WHERE m.user_id=$1 AND m.active ORDER BY o.name,o.id",
      [user(r)],
    );
    const links = await this.db.query(
      "SELECT l.agency_id,o.id,o.name,o.address,o.finess,f.latitude,f.longitude FROM agency_link l JOIN organization o ON o.id=l.establishment_id LEFT JOIN finess_establishment f ON f.finess=o.finess WHERE EXISTS(SELECT 1 FROM membership m WHERE m.user_id=$1 AND m.active AND m.organization_id=l.agency_id) ORDER BY o.name,o.id",
      [user(r)],
    );
    return { organizations, links };
  }
  @Put("organizations/:id") update(
    @Req() r: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: OrganizationDto,
  ) {
    return this.db.transaction(async (em) => {
      await member(em, user(r), id);
      const [o] = await em.query(
        "SELECT kind FROM organization WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (o.kind === "ESTABLISHMENT" && !b.finess)
        throw new BadRequestException("FINESS required");
      await em.query(
        "UPDATE organization SET name=$2,address=$3,referent=$4,finess=$5,siret=$6 WHERE id=$1",
        [id, b.name, b.address, b.referent, b.finess ?? null, b.siret ?? null],
      );
      await audit(em, user(r), "ORGANIZATION_UPDATED", id);
      return { ok: true };
    });
  }
  @Post("staffing-requests") create(
    @Req() r: Request,
    @Body() b: NeedDto,
    @Headers("idempotency-key") key: string,
  ) {
    return this.db.transaction(async (em) => {
      await member(em, user(r), b.establishmentId, "ESTABLISHMENT");
      const receipt = await commandReceipt(
        em,
        user(r),
        "staffing-request:create",
        key,
        b,
      );
      if (receipt.replay) return receipt.response;
      const [need] = await em.query(
        "INSERT INTO staffing_request(establishment_id,title,description,created_by,details,updated_at) VALUES($1,$2,$3,$4,$5,now()) RETURNING *",
        [
          b.establishmentId,
          b.title.trim(),
          b.description.trim(),
          user(r),
          JSON.stringify(normalizeNeedDetails(b.details)),
        ],
      );
      await audit(em, user(r), "STAFFING_REQUEST_CREATED", need.id);
      return receipt.save(need);
    });
  }
  @Get("staffing-requests") list(@Req() r: Request, @Query() page: PageDto) {
    return this.db.query(
      "SELECT s.*,o.name AS establishment_name,o.address AS establishment_address,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'status',m.status,'start_at',m.start_at,'end_at',m.end_at,'application_count',(SELECT count(*) FROM application a WHERE a.mission_id=m.id)) ORDER BY m.created_at DESC) FROM mission m WHERE m.staffing_request_id=s.id AND EXISTS(SELECT 1 FROM membership z WHERE z.user_id=$1 AND z.active AND z.organization_id IN(m.agency_id,m.establishment_id))),'[]'::jsonb) AS missions FROM staffing_request s JOIN organization o ON o.id=s.establishment_id WHERE EXISTS(SELECT 1 FROM membership m WHERE m.user_id=$1 AND m.active AND (m.organization_id=s.establishment_id OR EXISTS(SELECT 1 FROM agency_link l WHERE l.agency_id=m.organization_id AND l.establishment_id=s.establishment_id))) ORDER BY s.created_at DESC,s.id LIMIT $2 OFFSET $3",
      [user(r), page.limit, page.offset],
    );
  }
  @Get("staffing-requests/:id") async detail(
    @Req() r: Request,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const [need] = await this.db.query(
      "SELECT s.*,o.name AS establishment_name,o.address AS establishment_address,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'status',m.status,'start_at',m.start_at,'end_at',m.end_at,'application_count',(SELECT count(*) FROM application a WHERE a.mission_id=m.id)) ORDER BY m.created_at DESC) FROM mission m WHERE m.staffing_request_id=s.id AND EXISTS(SELECT 1 FROM membership z WHERE z.user_id=$1 AND z.active AND z.organization_id IN(m.agency_id,m.establishment_id))),'[]'::jsonb) AS missions FROM staffing_request s JOIN organization o ON o.id=s.establishment_id WHERE s.id=$2 AND EXISTS(SELECT 1 FROM membership m WHERE m.user_id=$1 AND m.active AND (m.organization_id=s.establishment_id OR EXISTS(SELECT 1 FROM agency_link l WHERE l.agency_id=m.organization_id AND l.establishment_id=s.establishment_id)))",
      [user(r), id],
    );
    if (!need) throw new NotFoundException();
    return need;
  }
  @Put("staffing-requests/:id") editNeed(
    @Req() r: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: NeedDto,
    @Headers("idempotency-key") key: string,
  ) {
    return this.db.transaction(async (em) => {
      const [need] = await em.query(
        "SELECT * FROM staffing_request WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!need) throw new NotFoundException();
      await member(em, user(r), need.establishment_id, "ESTABLISHMENT");
      if (need.establishment_id !== b.establishmentId)
        throw new BadRequestException("Organization cannot be reassigned");
      const receipt = await commandReceipt(
        em,
        user(r),
        "staffing-request:edit:" + id,
        key,
        b,
      );
      if (receipt.replay) return receipt.response;
      const [updated] = await em.query(
        "UPDATE staffing_request SET title=$2,description=$3,details=$4,updated_at=now() WHERE id=$1 RETURNING *",
        [
          id,
          b.title.trim(),
          b.description.trim(),
          JSON.stringify(normalizeNeedDetails(b.details)),
        ],
      );
      await audit(em, user(r), "STAFFING_REQUEST_UPDATED", id);
      return receipt.save(updated);
    });
  }
  @Get("me/notification-preferences") getPreferences(@Req() r: Request) {
    return this.db.transaction(async em => {
      await nurse(em, user(r));
      const [p] = await em.query("SELECT notifications_enabled AS enabled FROM profile WHERE user_id=$1", [user(r)]);
      return p;
    });
  }
  @Put("me/notification-preferences") preferences(
    @Req() r: Request,
    @Body() b: NotificationDto,
  ) {
    return this.db.transaction(async (em) => {
      await nurse(em, user(r));
      await em.query(
        "UPDATE profile SET notifications_enabled=$2 WHERE user_id=$1",
        [user(r), b.enabled],
      );
      return { enabled: b.enabled };
    });
  }
  @Get("assignments/:id/confirmation") confirmation(
    @Req() r: Request,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.db.transaction(async (em) => {
      const allowed = await em.query(
        "SELECT a.id FROM assignment a JOIN mission m ON m.id=a.mission_id WHERE a.id=$1 AND (a.nurse_id=$2 OR EXISTS(SELECT 1 FROM membership o WHERE o.user_id=$2 AND o.active AND o.organization_id IN(m.agency_id,m.establishment_id)))",
        [id, user(r)],
      );
      if (!allowed.length) throw new NotFoundException();
      const [c] = await em.query(
        "SELECT status,document_id,mission_version,template_version FROM mission_confirmation WHERE assignment_id=$1 ORDER BY mission_version DESC LIMIT 1",
        [id],
      );
      return c ?? { status: "PENDING", document_id: null };
    });
  }
}
@Module({ controllers: [OrganizationsController, AgencyEstablishmentsController], providers: [AgencyEstablishmentsService] })
export class OrganizationsModule {}
