import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageDto } from '../common/page.dto';
import { SqlClient } from '../database/database';
import { missionSelect } from '../missions/missions.service';

export class EstablishmentsPageDto extends PageDto {
  @ApiProperty({ required: false, maxLength: 150 })
  @IsOptional() @IsString() @MaxLength(150)
  q?: string;
}
export class EnterpriseMissionsPageDto extends PageDto {
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional() @IsUUID()
  establishmentId?: string;
}
const missionAccess = `EXISTS(SELECT 1 FROM membership member WHERE member.user_id=$1 AND member.active AND member.organization_id IN(m.agency_id,m.establishment_id))`;
export async function enterpriseMissionPage(db: SqlClient, actor: string, page: EnterpriseMissionsPageDto) {
  return db.query(missionSelect.replace(' FROM mission m', ',o.name AS establishment_name FROM mission m JOIN organization o ON o.id=m.establishment_id') +
    ` WHERE ${missionAccess} AND ($4::uuid IS NULL OR m.establishment_id=$4) ORDER BY m.created_at DESC,m.id LIMIT $2 OFFSET $3`,
    [actor,page.limit,page.offset,page.establishmentId ?? null]);
}
export async function establishmentPage(db: SqlClient, actor: string, page: EstablishmentsPageDto) {
  const [result] = await db.query(`WITH accessible AS (
    SELECT o.id,o.name,o.address,o.finess FROM organization o WHERE o.kind='ESTABLISHMENT'
    AND (EXISTS(SELECT 1 FROM membership member WHERE member.user_id=$1 AND member.active AND member.organization_id=o.id)
      OR EXISTS(SELECT 1 FROM agency_link link JOIN membership member ON member.organization_id=link.agency_id WHERE link.establishment_id=o.id AND member.user_id=$1 AND member.active))
    AND ($2='' OR strpos(lower(concat_ws(' ',o.name,o.address,o.finess)),lower($2))>0)
  ), selected AS (SELECT * FROM accessible ORDER BY name,id LIMIT $3 OFFSET $4), counted AS (
    SELECT o.*,c.counts,c.total FROM selected o CROSS JOIN LATERAL (
      SELECT jsonb_build_object('DRAFT',count(*) FILTER(WHERE m.status='DRAFT'),'OPEN',count(*) FILTER(WHERE m.status='OPEN'),
        'FILLED',count(*) FILTER(WHERE m.status='FILLED'),'COMPLETED',count(*) FILTER(WHERE m.status='COMPLETED'),'CANCELLED',count(*) FILTER(WHERE m.status='CANCELLED')) AS counts,
        count(*)::integer AS total FROM mission m WHERE m.establishment_id=o.id AND ${missionAccess}
    ) c
  ) SELECT COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.name,c.id) FROM counted c),'[]'::jsonb) AS items,
    (SELECT count(*)::integer FROM accessible) AS total`,[actor,page.q?.trim() ?? '',page.limit,page.offset]);
  return {...result,limit:page.limit,offset:page.offset};
}
