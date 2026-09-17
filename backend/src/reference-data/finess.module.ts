import {
  BadRequestException,
  Controller,
  Get,
  Module,
  Param,
  Query,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { Database } from "../database/database";
import { PageDto } from "../common/page.dto";
import { FINESS_PATTERN } from "./finess";
class SearchFinessDto extends PageDto {
  @ApiProperty({ required: false, minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q?: string;
}
@Controller("reference-data/finess")
export class FinessController {
  constructor(private readonly db: Database) {}
  @Get()
  async search(@Query() query: SearchFinessDto) {
    const result = await this.db.query(
      `SELECT s.generated_at,s.source_url,s.sha256,s.imported_at,
  (SELECT count(*)::int FROM finess_establishment e WHERE $1='' OR position(lower($1) in lower(e.name))>0 OR position($1 in e.finess)>0) AS total,
  COALESCE((SELECT jsonb_agg(t ORDER BY t.finess) FROM (SELECT * FROM finess_establishment e WHERE $1='' OR position(lower($1) in lower(e.name))>0 OR position($1 in e.finess)>0 ORDER BY finess LIMIT $2 OFFSET $3) t),'[]'::jsonb) AS items
  FROM finess_snapshot s WHERE s.id=1`,
      [query.q ?? "", query.limit, query.offset],
    );
    if (!result[0])
      throw new ServiceUnavailableException("FINESS reference not imported");
    return {
      ...result[0],
      limit: query.limit,
      offset: query.offset,
      grantsOrganizationAccess: false,
    };
  }
  @Get(":finess")
  async lookup(@Param("finess") finess: string) {
    if (!FINESS_PATTERN.test(finess))
      throw new BadRequestException("Invalid FINESS format");
    const rows = await this.db.query(
      `SELECT s.generated_at,s.source_url,s.sha256,s.imported_at,
  (SELECT to_jsonb(e) FROM finess_establishment e WHERE e.finess=$1) AS establishment FROM finess_snapshot s WHERE s.id=1`,
      [finess],
    );
    if (!rows[0])
      throw new ServiceUnavailableException("FINESS reference not imported");
    return {
      ...rows[0],
      status: rows[0].establishment ? "FOUND_IN_SNAPSHOT" : "NOT_IN_SNAPSHOT",
      grantsOrganizationAccess: false,
    };
  }
}
@Module({ controllers: [FinessController] })
export class FinessModule {}
