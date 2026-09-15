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
  IsUUID,
  IsString,
  IsOptional,
  Matches,
  Length,
  IsBoolean,
} from "class-validator";
import { Request } from "express";
import { Database, audit, event } from "../database/database";
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
class NeedDto {
  @ApiProperty({ type: () => String, required: true })
  @IsUUID()
  establishmentId!: string;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  @Length(3, 150)
  title!: string;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  @Length(10, 8000)
  description!: string;
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
        "INSERT INTO staffing_request(establishment_id,title,description,created_by) VALUES($1,$2,$3,$4) RETURNING *",
        [b.establishmentId, b.title, b.description, user(r)],
      );
      await audit(em, user(r), "STAFFING_REQUEST_CREATED", need.id);
      return receipt.save(need);
    });
  }
  @Get("staffing-requests") list(@Req() r: Request, @Query() page: PageDto) {
    return this.db.query(
      "SELECT s.* FROM staffing_request s WHERE EXISTS(SELECT 1 FROM membership m WHERE m.user_id=$1 AND m.active AND (m.organization_id=s.establishment_id OR EXISTS(SELECT 1 FROM agency_link l WHERE l.agency_id=m.organization_id AND l.establishment_id=s.establishment_id))) ORDER BY s.created_at DESC,s.id LIMIT $2 OFFSET $3",
      [user(r), page.limit, page.offset],
    );
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
@Module({ controllers: [OrganizationsController] })
export class OrganizationsModule {}
