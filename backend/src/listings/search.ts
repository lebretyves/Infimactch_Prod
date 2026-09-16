import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
  IsIn,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsString,
  MaxLength,
  Matches,
  IsInt,
  IsBoolean,
} from "class-validator";
import { BadRequestException } from "@nestjs/common";
import { PageDto } from "../common/page.dto";
import { interval } from "../domain/matching";
export class ExternalListingsDto extends PageDto {
  @ApiProperty({ type: String, required: false, maxLength: 150, description: "Search across title, service and location, before pagination." })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  q?: string;
}
export class SearchDto {
  @ApiProperty({ type: String, required: false, maxLength: 150, description: "Search across title, service and location, before pagination." })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  q?: string;

  @ApiProperty({
    type: () => Boolean,
    required: false,
    description:
      "Include incomplete external leads, explicitly marked with unverified search filters. Default false.",
  })
  @IsOptional()
  @IsBoolean()
  includeUncertainExternal?: boolean;

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
  qualifications!: string[];
  @ApiProperty({ type: () => String, required: false, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @Matches(/^[A-Z][A-Z0-9_]{0,79}$/, { each: true })
  ideServices?: string[];
  @ApiProperty({
    type: () => String,
    required: false,
    isArray: true,
    enum: ["ADULT", "PEDIATRIC", "MIXED"],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(["ADULT", "PEDIATRIC", "MIXED"], { each: true })
  iadePopulation?: string[];
  @ApiProperty({
    type: () => String,
    required: false,
    isArray: true,
    enum: ["GENERAL", "SPECIALIZED"],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @IsIn(["GENERAL", "SPECIALIZED"], { each: true })
  iadeBlocks?: string[];
  @ApiProperty({ type: () => String, required: false, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @Matches(/^[A-Z][A-Z0-9_]{0,79}$/, { each: true })
  iadeSpecialties?: string[];
  @ApiProperty({
    type: () => String,
    required: false,
    isArray: true,
    enum: ["ADULT", "PEDIATRIC", "MIXED"],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(["ADULT", "PEDIATRIC", "MIXED"], { each: true })
  ibodePopulation?: string[];
  @ApiProperty({
    type: () => String,
    required: false,
    isArray: true,
    enum: ["GENERAL", "SPECIALIZED"],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @IsIn(["GENERAL", "SPECIALIZED"], { each: true })
  ibodeBlocks?: string[];
  @ApiProperty({ type: () => String, required: false, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @Matches(/^[A-Z][A-Z0-9_]{0,79}$/, { each: true })
  ibodeSpecialties?: string[];
  @ApiProperty({
    type: () => String,
    required: false,
    isArray: true,
    enum: ["DAY", "NIGHT", "MIXED"],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(["DAY", "NIGHT", "MIXED"], { each: true })
  shifts?: string[];
  @ApiProperty({ type: () => String, required: false })
  @IsOptional()
  @IsUUID()
  establishmentId?: string;
  @ApiProperty({ type: () => Number, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @ApiProperty({ type: () => Number, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
  @ApiProperty({ type: () => Number, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1000)
  radiusKm?: number;
  @ApiProperty({ type: () => String, required: false })
  @IsOptional()
  @IsString()
  start?: string;
  @ApiProperty({ type: () => String, required: false })
  @IsOptional()
  @IsString()
  end?: string;
  @ApiProperty({ type: () => Number, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
  @ApiProperty({ type: () => Number, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  offset?: number;
}
export function searchSql(b: SearchDto) {
  const values: unknown[] = [];
  const bind = (v: unknown) => {
    values.push(v);
    return "$" + values.length;
  };
  const branches: string[] = [];
  for (const [q, prefix] of [
    ["IDE", "ide"],
    ["IADE", "iade"],
    ["IBODE", "ibode"],
  ]) {
    const keys = Object.keys(b).filter((k) => k.startsWith(prefix!));
    if (
      !b.qualifications.includes(q!) &&
      keys.some((k) => (b as any)[k]?.length)
    )
      throw new BadRequestException("Filter for unselected qualification");
    if (!b.qualifications.includes(q!)) continue;
    const parts = ["m.qualification=" + bind(q)];
    if (q === "IDE") {
      if (b.ideServices?.length)
        parts.push("m.service=ANY(" + bind(b.ideServices) + ")");
    } else {
      const pop = (b as any)[prefix + "Population"],
        blocks = (b as any)[prefix + "Blocks"],
        specialties = (b as any)[prefix + "Specialties"];
      if (pop?.length) parts.push("m.population=ANY(" + bind(pop) + ")");
      if (blocks?.length) parts.push("m.block=ANY(" + bind(blocks) + ")");
      if (specialties?.length)
        parts.push(
          "(m.block='GENERAL' OR (m.block='SPECIALIZED' AND m.specialty=ANY(" +
            bind(specialties) +
            ")))",
        );
    }
    branches.push("(" + parts.join(" AND ") + ")");
  }
  if (!branches.length)
    throw new BadRequestException("At least one qualification required");
  const filters = ["m.status='OPEN'", "(" + branches.join(" OR ") + ")"];
  if (b.shifts?.length) filters.push("m.shift=ANY(" + bind(b.shifts) + ")");
  if (b.establishmentId)
    filters.push("m.establishment_id=" + bind(b.establishmentId));
  if (b.start || b.end) {
    if (!b.start || !b.end)
      throw new BadRequestException("Both dates required");
    try {
      interval({ start: b.start, end: b.end });
    } catch {
      throw new BadRequestException("Invalid search interval");
    }
    filters.push(
      "m.start_at<" + bind(b.end) + " AND m.end_at>" + bind(b.start),
    );
  }
  if (
    b.radiusKm !== undefined ||
    b.latitude !== undefined ||
    b.longitude !== undefined
  ) {
    if (
      b.radiusKm === undefined ||
      b.latitude === undefined ||
      b.longitude === undefined
    )
      throw new BadRequestException("Coordinates and radius required together");
    filters.push(
      "ST_DWithin(m.location,ST_SetSRID(ST_MakePoint(" +
        bind(b.longitude) +
        "," +
        bind(b.latitude) +
        "),4326)::geography," +
        bind(b.radiusKm * 1000) +
        ")",
    );
  }
  const sql =
    " WHERE " +
    filters.join(" AND ") +
    " ORDER BY m.start_at,m.id LIMIT " +
    bind(b.limit ?? 20) +
    " OFFSET " +
    bind(b.offset ?? 0);
  return {
    sql,
    values,
    where: filters.join(" AND "),
    parameters: values.slice(0, -2),
  };
}
