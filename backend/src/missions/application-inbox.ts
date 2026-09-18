import { displayMatch } from '../domain/matching-display';
﻿import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PageDto } from '../common/page.dto';
import { SqlClient } from '../database/database';
import { experienceMonths, requiredMissionSkills } from '../domain/matching';
import { professional } from '../profiles/profiles.module';
import { matchingMission } from './missions.service';
export class ApplicationInboxDto extends PageDto {
 @ApiProperty({required:false,maxLength:150})
 @IsOptional() @IsString() @MaxLength(150) q?:string;
}
const joins=' FROM application a JOIN mission m ON m.id=a.mission_id JOIN profile p ON p.user_id=a.nurse_id JOIN organization o ON o.id=m.establishment_id ';
const projection=`SELECT a.*,p.display_name,p.qualifications,p.skills,p.rpps_status,p.experience,p.available,p.unavailable,p.radius_km,COALESCE(p.details->>'mobilityCity',p.details->>'city') AS city,
 row_to_json(p) AS profile_data,row_to_json(m) AS mission_data,o.name AS establishment_name,
 ST_Y(m.location::geometry) AS mission_latitude,ST_X(m.location::geometry) AS mission_longitude,
 CASE WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL AND m.location IS NOT NULL THEN ST_Distance(ST_SetSRID(ST_MakePoint(p.longitude,p.latitude),4326)::geography,m.location)/1000 ELSE NULL END AS distance_km`;
async function comparisons(db:SqlClient,rows:any[]) {
 if(!rows.length)return [];
 const conflicts=await db.query("SELECT nurse_id,start_at,end_at FROM assignment WHERE nurse_id=ANY($1::uuid[]) AND status='ACTIVE'",[[...new Set(rows.map(r=>r.nurse_id))]]);
 return rows.map(row=>{
  const {profile_data,mission_data,mission_latitude,mission_longitude,distance_km,establishment_name,...candidate}=row;
  const p=professional(profile_data,conflicts.filter(a=>a.nurse_id===row.nurse_id));
  const m=matchingMission({...mission_data,latitude:mission_latitude,longitude:mission_longitude});
  const matching={...displayMatch(p,m,distance_km===null?null:Number(distance_km)),experienceMonths:experienceMonths(p.experience,m.service,m.start),requiredExperienceMonths:m.minExperienceMonths,qualificationMatches:p.qualifications.includes(m.qualification),rppsStatus:p.rppsStatus,missingRequiredSkills:requiredMissionSkills(m).filter(s=>!p.skills.includes(s)),desiredSkillsMatched:m.desiredSkills.filter(s=>p.skills.includes(s)),desiredSkills:m.desiredSkills,radiusKm:p.radiusKm};
  const {id,title,qualification,service,start_at,end_at,timezone,schedule_precision,address,min_experience_months}=mission_data;
  return {...candidate,mission:{id,title,qualification,service,start_at,end_at,timezone,schedule_precision,address,min_experience_months,establishment_name},matching};
 });
}
export async function enterpriseApplicationPage(db:SqlClient,actor:string,page:ApplicationInboxDto){
 const term=(page.q??'').trim().replace(/[\\%_]/g,'\\$&');
 const where=`WHERE a.status IN('SUBMITTED','SELECTED') AND EXISTS(SELECT 1 FROM membership x WHERE x.user_id=$1 AND x.active AND x.organization_id IN(m.agency_id,m.establishment_id)) AND ($2='' OR concat_ws(' ',p.display_name,m.title,m.qualification,m.address,o.name) ILIKE '%'||$2||'%')`;
 const args=[actor,term];
 const [count]=await db.query('SELECT count(*)::int AS total'+joins+where,args);
 const rows=await db.query(projection+joins+where+' ORDER BY a.updated_at DESC,a.id LIMIT $3 OFFSET $4',[...args,page.limit,page.offset]);
 return {total:count.total,items:await comparisons(db,rows)};
}
// Caller checks mission scope before invoking this query.
export async function missionApplicationPage(db:SqlClient,id:string,page:PageDto){
 const rows=await db.query(projection+joins+' WHERE a.mission_id=$1 ORDER BY a.updated_at DESC,a.id LIMIT $2 OFFSET $3',[id,page.limit,page.offset]);
 return comparisons(db,rows);
}
