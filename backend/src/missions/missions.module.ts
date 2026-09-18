import { ApplicationInboxDto, enterpriseApplicationPage, missionApplicationPage } from "./application-inbox";
import { enterpriseMissionPage, EnterpriseMissionsPageDto } from "../organizations/establishment-directory";
import { PageDto } from "../common/page.dto";
import { Query } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import {
  Body,
  Controller,
  Post,
  Put,
  Get,
  Param,
  Req,
  Headers,
  Module,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from "@nestjs/common";
import { IsInt, Min, IsUUID } from "class-validator";
import { Request } from "express";
import { SessionGuard, user } from "../common/access";
import { Database } from "../database/database";
import { MissionsService, missionSelect, scope } from "./missions.service";
import { MissionDto } from "./mission.dto";
class ConsentDto {
  @ApiProperty({ type: () => Number, required: true })
  @IsInt()
  @Min(1)
  version!: number;
}
class AssignmentDto {
  @ApiProperty({ type: () => String, required: true })
  @IsUUID()
  applicationId!: string;
}
@Controller()
@UseGuards(SessionGuard)
class MissionsController {
  constructor(
    private readonly service: MissionsService,
    private readonly db: Database,
  ) {}
  @Post("missions") create(
    @Req() r: Request,
    @Body() b: MissionDto,
    @Headers("idempotency-key") key: string,
  ) {
    return this.service.create(user(r), b, key);
  }
  @Post("missions/open") createOpen(
    @Req() r: Request,
    @Body() b: MissionDto,
    @Headers("idempotency-key") key: string,
  ) {
    return this.service.create(user(r), b, key, true);
  }
  @Put("missions/:id") edit(
    @Req() r: Request,
    @Headers("idempotency-key") key: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: MissionDto,
  ) {
    return this.service.edit(user(r), id, b, key);
  }
  @Post("missions/:id/publish") publish(
    @Req() r: Request,
    @Headers("idempotency-key") key: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.transition(user(r), id, "publish", key);
  }
  @Post("missions/:id/cancel") cancel(
    @Req() r: Request,
    @Headers("idempotency-key") key: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.transition(user(r), id, "cancel", key);
  }
  @Post("missions/:id/reopen") reopen(
    @Req() r: Request,
    @Headers("idempotency-key") key: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.transition(user(r), id, "reopen", key);
  }
  @Post("missions/:id/complete") complete(
    @Req() r: Request,
    @Headers("idempotency-key") key: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.transition(user(r), id, "complete", key);
  }
  @Get("missions/:id/application-check") applicationCheck(
    @Req() r: Request,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.applicationCheck(user(r), id);
  }
  @Post("missions/:id/applications") apply(
    @Req() r: Request,
    @Headers("idempotency-key") key: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: ConsentDto,
  ) {
    return this.service.apply(user(r), id, b.version, key);
  }
  @Post("applications/:id/withdrawal") withdraw(
    @Req() r: Request,
    @Headers("idempotency-key") key: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.applicationAction(user(r), id, "WITHDRAWN", key);
  }
  @Post("applications/:id/selection") select(
    @Req() r: Request,
    @Headers("idempotency-key") key: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.applicationAction(user(r), id, "SELECTED", key);
  }
  @Post("applications/:id/rejection") reject(
    @Req() r: Request,
    @Headers("idempotency-key") key: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.applicationAction(user(r), id, "REJECTED", key);
  }
  @Post("missions/:id/assignments") assign(
    @Req() r: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: AssignmentDto,
    @Headers("idempotency-key") key: string,
  ) {
    return this.service.assign(user(r), id, b.applicationId, key);
  }
  @Get("enterprise/applications") applicationInbox(@Req() r: Request, @Query() page: ApplicationInboxDto) {
    return this.db.transaction(em => enterpriseApplicationPage(em,user(r),page));
  }
  @Get("me/applications") applications(
    @Req() r: Request,
    @Query() page: PageDto,
  ) {
    return this.db.query(
      "SELECT a.*,m.title,m.version AS current_version,(a.consent_version!=m.version) AS requires_reconsent,x.id AS assignment_id,x.status AS assignment_status FROM application a JOIN mission m ON m.id=a.mission_id LEFT JOIN LATERAL(SELECT id,status FROM assignment WHERE application_id=a.id ORDER BY created_at DESC LIMIT 1)x ON true WHERE a.nurse_id=$1 ORDER BY a.updated_at DESC,a.id LIMIT $2 OFFSET $3",
      [user(r), page.limit, page.offset],
    );
  }
  @Get("missions") missions(@Req() r: Request, @Query() page: EnterpriseMissionsPageDto) {
    return enterpriseMissionPage(this.db, user(r), page);
  }
  @Get("missions/:id") async ownMission(
    @Req() r: Request,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.db.transaction(async (em) => {
      const [m] = await em.query(missionSelect + " WHERE m.id=$1", [id]);
      if (!m) throw new NotFoundException();
      await scope(em, user(r), m);
      const applications = await em.query(
        "SELECT count(*)::integer AS count FROM application WHERE mission_id=$1",
        [id],
      );
      const assignments = await em.query(
        "SELECT a.id,a.status,a.nurse_id,p.display_name FROM assignment a JOIN profile p ON p.user_id=a.nurse_id WHERE a.mission_id=$1 ORDER BY a.created_at DESC",
        [id],
      );
      const [permission] = await em.query("SELECT EXISTS(SELECT 1 FROM membership WHERE user_id=$1 AND active AND organization_id=COALESCE($2::uuid,$3::uuid)) AS can_manage",[user(r),m.agency_id,m.establishment_id]);
      const events = await em.query("SELECT event,created_at FROM audit WHERE resource_id=$1 ORDER BY created_at DESC,id DESC LIMIT 50",[id]);
      return { ...m, can_manage:permission.can_manage, application_count: applications[0].count, assignments, events };
    });
  }
  @Get("applications/:id") async applicationDetail(
    @Req() r: Request,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.db.transaction(async (em) => {
      const [a] = await em.query(
        "SELECT a.*,m.title,m.version AS current_version,m.agency_id,m.establishment_id,(a.consent_version!=m.version) AS requires_reconsent FROM application a JOIN mission m ON m.id=a.mission_id WHERE a.id=$1",
        [id],
      );
      if (!a) throw new NotFoundException();
      if (a.nurse_id !== user(r)) await scope(em, user(r), a);
      const assignments = await em.query(
        "SELECT id,status FROM assignment WHERE application_id=$1 ORDER BY created_at DESC",
        [id],
      );
      const events = await em.query(
        "SELECT event,created_at FROM audit WHERE resource_id=$1 OR resource_id IN(SELECT id FROM assignment WHERE application_id=$1) ORDER BY created_at,id",
        [id],
      );
      return { ...a, assignments, events };
    });
  }
  @Get("missions/:id/applications") async candidates(
    @Req() r: Request,
    @Query() page: PageDto,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.db.transaction(async (em) => {
      const [m] = await em.query("SELECT * FROM mission WHERE id=$1", [id]);
      await scope(em, user(r), m ?? {});
      return missionApplicationPage(em,id,page);
    });
  }
}
@Module({
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
