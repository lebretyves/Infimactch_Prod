import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ProfileDetailsDto } from '../../src/profiles/profile-details';
import { professional } from '../../src/profiles/profiles.module';
import { assessApplication } from '../../src/missions/application-assessment';
import { eligible } from '../../src/missions/missions.service';
import type { MatchMission, Professional } from '../../src/domain/matching';
const validate = (value: unknown) => validateSync(plainToInstance(ProfileDetailsDto, value), {whitelist:true, forbidNonWhitelisted:true});
test('practice preferences accept multiple services per role and explicit empty preferences', () => {
 assert.equal(validate({practiceServices:{IDE:['URGENCES','REANIMATION'],IADE:['ANESTHESIE','SMUR'],IBODE:[]}}).length,0);
 assert.equal(validate({}).length,0);
 for(const practiceServices of [{IDE:['ANESTHESIE']},{IADE:['NOT_A_SERVICE']},{MEDECIN:[]},{IDE:'URGENCES'},{IDE:['URGENCES','URGENCES']}])
  assert.ok(validate({practiceServices}).length);
});
test('the stored profile maps service choices into every matching consumer', () => {
 const choices={IDE:['URGENCES'],IADE:['ANESTHESIE']};
 assert.deepEqual(professional({details:{practiceServices:choices}}).practiceServices,choices);
 assert.equal(professional({}).practiceServices,undefined);
});
test('service preferences warn on voluntary applications but do not block an explicit eligible assignment', async () => {
 const year=new Date().getUTCFullYear()+1;
 const m: MatchMission={start:`${year}-01-01T08:00:00Z`,end:`${year}-01-01T16:00:00Z`,status:'OPEN',qualification:'IDE',service:'URGENCES',requiredSkills:[],desiredSkills:[],minExperienceMonths:0,population:'ADULT',block:'NONE',specialty:null,shift:'DAY',latitude:48,longitude:2};
 const p: Professional={qualifications:['IDE'],skills:[],experience:[],available:[m],unavailable:[],conflicts:[],rppsStatus:'FOUND',latitude:48,longitude:2,radiusKm:30,acceptedShifts:['DAY'],preferredShifts:[],practiceServices:{IDE:['CARDIOLOGIE']}};
 const result=assessApplication(p,m,0);
 assert.ok(result.warnings.includes('SERVICE_NOT_PREFERRED'));
 assert.deepEqual(result.blockingReasons,[]);
 const stored={...p,user_id:'nurse',rpps_status:'FOUND',radius_km:30,accepted_shifts:['DAY'],preferred_shifts:[],details:{practiceServices:p.practiceServices}};
 const mission={...m,start_at:m.start,end_at:m.end,required_skills:[],desired_skills:[],min_experience_months:0};
 const db={query:async(sql:string)=>sql.includes('ST_Distance')?[{distance:0}]:[]} as any;
 assert.equal((await eligible(db,stored,mission)).eligible,true);
});
