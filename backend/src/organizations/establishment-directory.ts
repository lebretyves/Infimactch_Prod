import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, IsIn, IsDateString, Matches } from 'class-validator';
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
  @ApiProperty({required:false,enum:['IDE','IADE','IBODE']})
  @IsOptional() @IsIn(['IDE','IADE','IBODE'])
  qualification?: string;
  @ApiProperty({required:false,maxLength:150})
  @IsOptional() @IsString() @MaxLength(150)
  location?: string;
  @ApiProperty({required:false,format:'date'})
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({strict:true})
  date?: string;
  @ApiProperty({required:false,maxLength:150})
  @IsOptional() @IsString() @MaxLength(150)
  q?: string;
  @ApiProperty({required:false,enum:['OPEN','DRAFT','FILLED','COMPLETED','CANCELLED']})
  @IsOptional() @IsIn(['OPEN','DRAFT','FILLED','COMPLETED','CANCELLED'])
  status?: string;
  @ApiProperty({required:false,enum:['DAY','NIGHT','MIXED','UNKNOWN']})
  @IsOptional() @IsIn(['DAY','NIGHT','MIXED','UNKNOWN'])
  shift?: string;
  @ApiProperty({required:false,enum:['created_desc','start_asc','start_desc']})
  @IsOptional() @IsIn(['created_desc','start_asc','start_desc'])
  sort?: string;
}
const missionAccess = `EXISTS(SELECT 1 FROM membership member WHERE member.user_id=$1 AND member.active AND member.organization_id IN(m.agency_id,m.establishment_id))`;
function enterpriseMissionQuery(actor: string, page: EnterpriseMissionsPageDto) {
  const select = missionSelect.replace(' FROM mission m', ',o.name AS establishment_name,EXISTS(SELECT 1 FROM membership manager WHERE manager.user_id=$1 AND manager.active AND manager.organization_id=COALESCE(m.agency_id,m.establishment_id)) AS can_manage FROM mission m JOIN organization o ON o.id=m.establishment_id');
  const where = ` WHERE ${missionAccess} AND ($4::uuid IS NULL OR m.establishment_id=$4)
    AND ($5::text IS NULL OR m.qualification=$5)
    AND ($6='' OR strpos(lower(concat_ws(' ',m.address,o.address,o.name,o.finess)),lower($6))>0)
    AND ($7::date IS NULL OR ((m.start_at AT TIME ZONE m.timezone)<($7::date+1)::timestamp AND (m.end_at AT TIME ZONE m.timezone)>$7::date::timestamp))
    AND ($8='' OR strpos(lower(concat_ws(' ',m.title,replace(m.service,'_',' '),m.qualification)),lower($8))>0)
    AND ($9::text IS NULL OR m.status::text=$9)
    AND ($10::text IS NULL OR m.shift::text=$10)`;
  const values = [actor,page.limit,page.offset,page.establishmentId ?? null,page.qualification ?? null,page.location?.trim() ?? '',page.date ?? null,page.q?.trim() ?? '',page.status ?? null,page.shift ?? null];
  // Only allowlisted expressions enter SQL; every search value is parameterized.
  const order = page.sort === 'start_asc' ? 'start_at ASC,id ASC' : page.sort === 'start_desc' ? 'start_at DESC,id ASC' : 'created_at DESC,id ASC';
  return {select,where,values,order};
}
/** Legacy array contract, still used by the overview dashboard. */
export async function enterpriseMissionPage(db: SqlClient, actor: string, page: EnterpriseMissionsPageDto) {
  const {select,where,values,order} = enterpriseMissionQuery(actor,page);
  return db.query(`SELECT * FROM (${select}${where}) accessible ORDER BY ${order} LIMIT $2 OFFSET $3`,values);
}
/** Count and page share a single snapshot, including an empty/out-of-range page. */
export async function enterpriseMissionSearch(db: SqlClient, actor: string, page: EnterpriseMissionsPageDto) {
  const {select,where,values,order} = enterpriseMissionQuery(actor,page);
  const [result] = await db.query(`WITH filtered AS (${select}${where}),
    selected AS (SELECT * FROM filtered ORDER BY ${order} LIMIT $2 OFFSET $3)
    SELECT COALESCE((SELECT jsonb_agg(to_jsonb(selected) ORDER BY ${order}) FROM selected),'[]'::jsonb) AS items,
    (SELECT count(*)::integer FROM filtered) AS total`,values);
  return {...result,limit:page.limit,offset:page.offset};
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
