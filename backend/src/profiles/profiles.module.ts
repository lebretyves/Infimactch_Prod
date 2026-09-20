import {CvController} from './cv.controller';
import { SearchAreaDto } from './search-area';
import {assertPersonalInformationUnchanged} from './personal-information';
import {
  changeAvailability,
  normalizeAvailability,
} from "../domain/availability";
import { ProfileDetailsDto } from "./profile-details";
import { worsensCommittedAvailability } from "../domain/assignment-profile";
import { ApiProperty, ApiOperation, ApiOkResponse } from "@nestjs/swagger";
import {
  Body,
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Req,
  Module,
  Injectable,
  UseGuards,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import {
  IsString,
  IsArray,
  IsIn,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Length,
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  ValidateNested,
  ValidateIf,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { Request } from "express";
import { Database, audit, queueProfileMatches } from "../database/database";
import { nurse, user, SessionGuard } from "../common/access";
import { interval, Professional } from "../domain/matching";
import { RppsService } from "./rpps";
export class PeriodDto {
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  start!: string;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  end!: string;
}
export class AvailabilityChangeDto extends PeriodDto {
  @ApiProperty({ enum: ["available", "unavailable", "unset"] })
  @IsIn(["available", "unavailable", "unset"])
  state!: "available" | "unavailable" | "unset";
}
export class AvailabilityPatchDto {
  @ApiProperty({ type: () => AvailabilityChangeDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityChangeDto)
  changes!: AvailabilityChangeDto[];
}
function ensureAvailabilityLimit(value: {
  available: PeriodDto[];
  unavailable: PeriodDto[];
}) {
  if (value.available.length > 200 || value.unavailable.length > 200)
    throw new BadRequestException({
      code: "AVAILABILITY_LIMIT",
      message:
        "Votre planning dépasse 200 périodes distinctes par état. Réduisez la période sélectionnée ou regroupez vos créneaux.",
    });
}
class ExperienceDto extends PeriodDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  establishment?: string;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  @Length(1, 80)
  service!: string;
}
export class ProfileDto {
  @ApiProperty({ type: () => ProfileDetailsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileDetailsDto)
  details?: ProfileDetailsDto;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  @Length(2, 100)
  displayName!: string;
  @ApiProperty({
    type: () => String,
    required: true,
    isArray: true,
    enum: ["IDE", "IADE", "IBODE"],
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(3)
  @IsIn(["IDE", "IADE", "IBODE"], { each: true })
  qualifications!: ("IDE" | "IADE" | "IBODE")[];
  @ApiProperty({ type: () => String, required: true, isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Matches(/^[A-Z][A-Z0-9_]{0,79}$/, { each: true })
  skills!: string[];
  @ApiProperty({ type: () => ExperienceDto, required: true, isArray: true })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience!: ExperienceDto[];
  @ApiProperty({ type: () => PeriodDto, required: true, isArray: true })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PeriodDto)
  available!: PeriodDto[];
  @ApiProperty({ type: () => PeriodDto, required: true, isArray: true })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PeriodDto)
  unavailable!: PeriodDto[];
  @ApiProperty({ type: () => Number, required: true })
  @ValidateIf((_object, value) => value !== null)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number | null;
  @ApiProperty({ type: () => Number, required: true })
  @ValidateIf((_object, value) => value !== null)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number | null;
  @ApiProperty({ type: () => Number, required: true })
  @ValidateIf((_object, value) => value !== null)
  @IsNumber()
  @Min(0.1)
  @Max(1000)
  radiusKm!: number | null;
  @ApiProperty({
    type: () => String,
    required: true,
    isArray: true,
    enum: ["DAY", "NIGHT", "MIXED"],
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(3)
  @IsIn(["DAY", "NIGHT", "MIXED"], { each: true })
  acceptedShifts!: string[];
  @ApiProperty({
    type: () => String,
    required: true,
    isArray: true,
    enum: ["DAY", "NIGHT", "MIXED"],
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(3)
  @IsIn(["DAY", "NIGHT", "MIXED"], { each: true })
  preferredShifts!: string[];
  @ApiProperty({ type: () => Boolean, required: true })
  @IsBoolean()
  visible!: boolean;
}
class RppsDto {
  @ApiProperty({ type: () => String, required: true })
  @Matches(/^\d{11}$/)
  number!: string;
}
export function professional(p: any, conflicts: any[] = []): Professional {
  return {
    qualifications: p.qualifications,
    practiceServices: p.details?.practiceServices,
    skills: p.skills,
    experience: p.experience,
    available: p.available,
    unavailable: p.unavailable,
    conflicts: conflicts.map((a) => ({
      start: new Date(a.start_at).toISOString(),
      end: new Date(a.end_at).toISOString(),
    })),
    rppsStatus: p.rpps_status,
    latitude: p.latitude,
    longitude: p.longitude,
    radiusKm: p.radius_km,
    acceptedShifts: p.accepted_shifts,
    preferredShifts: p.preferred_shifts,
  };
}
export function validateProfile(b: ProfileDto) {
  try {
    for (const i of [...b.available, ...b.unavailable, ...b.experience])
      interval(i);
  } catch {
    throw new BadRequestException("Invalid interval or missing timezone");
  }
  if (b.experience.some((e) => Date.parse(e.end) > Date.now()))
    throw new BadRequestException("Experience must describe completed periods");
  if (
    b.qualifications.some((q) => q !== "IDE") &&
    !b.qualifications.includes("IDE")
  )
    throw new BadRequestException("Complete the IDE qualification explicitly");
  if (b.preferredShifts.some((s) => !b.acceptedShifts.includes(s)))
    throw new BadRequestException("Preferred shift must be accepted");
  if (b.details?.birthDate) {
    const date = new Date(b.details.birthDate + "T00:00:00Z");
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== b.details.birthDate ||
      date > new Date()
    )
      throw new BadRequestException("Invalid birth date");
  }
  if (
    [
      b.details?.diplomaYear,
      b.details?.ideDiplomaYear,
      b.details?.iadeDiplomaYear,
      b.details?.ibodeDiplomaYear,
    ].some((year) => year !== undefined && year > new Date().getFullYear())
  )
    throw new BadRequestException("Diploma year cannot be in the future");
  if (b.details?.ideDiplomaYear !== undefined &&
      [b.details.iadeDiplomaYear, b.details.ibodeDiplomaYear]
        .some(year => year !== undefined && year < b.details!.ideDiplomaYear!))
    throw new BadRequestException("Specialist diploma year cannot precede IDE diploma year");
  // Canonicalize every full-profile write, including registration and legacy clients.
  const normalized = normalizeAvailability(b);
  ensureAvailabilityLimit(normalized);
  b.available = normalized.available;
  b.unavailable = normalized.unavailable;
}
@Injectable()
export class ProfilesService {
  constructor(private readonly db: Database) {}
  async changeSearchArea(actor: string, b: SearchAreaDto) {
    return this.db.transaction(async (em) => {
      const current = await nurse(em, actor);
      const city = b.city.trim();
      if (current.latitude === b.latitude && current.longitude === b.longitude &&
          current.radius_km === b.radiusKm && current.details?.mobilityCity === city)
        return { latitude: current.latitude, longitude: current.longitude,
          radius_km: current.radius_km, details: current.details };
      const [updated] = await em.query(
        "UPDATE profile SET latitude=$2,longitude=$3,radius_km=$4,details=jsonb_set(COALESCE(details,'{}'::jsonb),'{mobilityCity}',to_jsonb($5::text)),updated_at=now() WHERE user_id=$1 RETURNING latitude,longitude,radius_km,details",
        [actor, b.latitude, b.longitude, b.radiusKm, city],
      );
      await audit(em, actor, "SEARCH_AREA_UPDATED", actor);
      await queueProfileMatches(em, actor);
      return updated;
    });
  }

  async changeAvailability(actor: string, b: AvailabilityPatchDto) {
    try {
      for (const change of b.changes) interval(change);
    } catch {
      throw new BadRequestException("Invalid interval or missing timezone");
    }
    return this.db.transaction(async (em) => {
      // nurse() locks this profile row: parallel slot updates cannot overwrite each other.
      const current = await nurse(em, actor);
      const next = changeAvailability(current, b.changes);
      ensureAvailabilityLimit(next);
      const active = await em.query(
        "SELECT start_at,end_at FROM assignment WHERE nurse_id=$1 AND status='ACTIVE'",
        [actor],
      );
      for (const assignment of active) {
        const period = {
          start: new Date(assignment.start_at).toISOString(),
          end: new Date(assignment.end_at).toISOString(),
        };
        if (worsensCommittedAvailability(period, current, next))
          throw new ConflictException({
            code: "ACTIVE_ASSIGNMENT_INCOMPATIBLE",
            reasons: ["NOT_FULLY_AVAILABLE"],
          });
      }
      await em.query(
        "UPDATE profile SET available=$2,unavailable=$3,updated_at=now() WHERE user_id=$1",
        [
          actor,
          JSON.stringify(next.available),
          JSON.stringify(next.unavailable),
        ],
      );
      await audit(em, actor, "AVAILABILITY_UPDATED", actor);
      await queueProfileMatches(em, actor);
      return next;
    });
  }
  async update(actor: string, b: ProfileDto) {
    validateProfile(b);
    return this.db.transaction(async (em) => {
      const previous = await nurse(em, actor);
      assertPersonalInformationUnchanged(previous,b);
      const active = await em.query(
        "SELECT a.start_at,a.end_at,m.qualification FROM assignment a JOIN mission m ON m.id=a.mission_id WHERE a.nurse_id=$1 AND a.status='ACTIVE'",
        [actor],
      );
      for (const assignment of active) {
        const reasons: string[] = [];
        if (!b.qualifications.includes(assignment.qualification)) reasons.push("QUALIFICATION_MISSING");
        const period = {
          start: new Date(assignment.start_at).toISOString(),
          end: new Date(assignment.end_at).toISOString(),
        };
        if (worsensCommittedAvailability(period, previous, b)) reasons.push("NOT_FULLY_AVAILABLE");
        if (reasons.length)
          throw new ConflictException({code: "ACTIVE_ASSIGNMENT_INCOMPATIBLE", reasons});
      }
      await em.query(
        "UPDATE profile SET display_name=$2,qualifications=$3,skills=$4,experience=$5,available=$6,unavailable=$7,latitude=$8,longitude=$9,radius_km=$10,accepted_shifts=$11,preferred_shifts=$12,visible=$13,details=COALESCE($14::jsonb,details),updated_at=now() WHERE user_id=$1",
        [
          actor,
          b.displayName,
          b.qualifications,
          b.skills,
          JSON.stringify(b.experience),
          JSON.stringify(b.available),
          JSON.stringify(b.unavailable),
          b.latitude,
          b.longitude,
          b.radiusKm,
          b.acceptedShifts,
          b.preferredShifts,
          b.visible,
          b.details ? JSON.stringify(b.details) : null,
        ],
      );
      await em.query(
        "DELETE FROM profile_qualification WHERE nurse_id=$1 AND NOT(code=ANY($2))",
        [actor, b.qualifications],
      );
      for (const code of b.qualifications)
        await em.query(
          "INSERT INTO profile_qualification(nurse_id,code) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [actor, code],
        );
      await audit(em, actor, "PROFILE_UPDATED", actor);
      await queueProfileMatches(em, actor);
      return { ok: true };
    });
  }
}
@Controller("profile")
@UseGuards(SessionGuard)
export class ProfilesController {
  constructor(
    private readonly db: Database,
    private readonly profiles: ProfilesService,
    private readonly rpps: RppsService,
  ) {}
  @Get() async get(@Req() req: Request) {
    return this.db.transaction(async (em) => {
      const profile=await nurse(em,user(req));
      // Present legacy overlaps consistently without silently rewriting stored user data.
      return {...profile,...normalizeAvailability(profile)};
    });
  }
  @Patch("availability") availability(
    @Req() req: Request,
    @Body() b: AvailabilityPatchDto,
  ) {
    return this.profiles.changeAvailability(user(req), b);
  }
  @Patch("search-area")
  @ApiOperation({ summary: 'Enregistrer la zone de recherche et d’alertes', description: 'Modifie uniquement la position, le rayon et le libellé de mobilité du profil connecté. Préserve le domicile, les disponibilités et les préférences de notifications.' })
  @ApiOkResponse({ schema: { type: 'object', required: ['latitude', 'longitude', 'radius_km', 'details'], properties: {
    latitude: { type: 'number' }, longitude: { type: 'number' }, radius_km: { type: 'number' },
    details: { type: 'object', additionalProperties: true },
  } } })
  searchArea(
    @Req() req: Request,
    @Body() b: SearchAreaDto,
  ) {
    return this.profiles.changeSearchArea(user(req), b);
  }
  @Put() update(@Req() req: Request, @Body() b: ProfileDto) {
    return this.profiles.update(user(req), b);
  }
  @Put("rpps") rppsCheck(@Req() req: Request, @Body() b: RppsDto) {
    return this.rpps.verify(user(req), b.number);
  }
  @Post("rpps/retry") async retry(@Req() req: Request) {
    const [p] = await this.db.query(
      "SELECT rpps_number FROM profile WHERE user_id=$1",
      [user(req)],
    );
    if (!p?.rpps_number) throw new BadRequestException("RPPS missing");
    return this.rpps.verify(user(req), p.rpps_number);
  }
}
@Module({
  controllers: [ProfilesController,CvController],
  providers: [ProfilesService, RppsService],
  exports: [RppsService, ProfilesService],
})
export class ProfilesModule {}
