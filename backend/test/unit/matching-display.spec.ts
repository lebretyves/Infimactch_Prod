import {test} from 'node:test';
import assert from 'node:assert/strict';
import {displayMatch} from '../../src/domain/matching-display';
import {match,Professional,MatchMission} from '../../src/domain/matching';
import {listingOrder} from '../../src/listings/listing-order';
import {SearchDto} from '../../src/listings/search';
const slot={start:'2030-10-10T06:00:00Z',end:'2030-10-10T14:00:00Z'};
const m:MatchMission={...slot,status:'OPEN',qualification:'IDE',service:'URGENCES',requiredSkills:['TRIAGE'],desiredSkills:['TRIAGE'],minExperienceMonths:12,population:'ADULT',block:'NONE',specialty:null,shift:'DAY',latitude:48,longitude:2};
const p:Professional={qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],conflicts:[],rppsStatus:'FOUND',latitude:null,longitude:null,radiusKm:null,acceptedShifts:['DAY'],preferredShifts:[]};
test('incomplete profile exposes an estimate without granting eligibility or fabricating strict score',()=>{
 const r=displayMatch(p,m,null);
 assert.equal(r.eligible,false);assert.equal(r.score,null);assert.equal(r.indicativeScore,20);
 assert.ok(r.reasons.includes('MOBILITY_INCOMPLETE'));assert.ok(r.reasons.includes('NOT_FULLY_AVAILABLE'));
 assert.equal(match(p,m,null).score,null);
});
test('unknown distance and unknown schedule add no points and never redistribute their weights',()=>{
 assert.equal(displayMatch(p,{...m,shift:'UNKNOWN'},null).indicativeScore,0);
 assert.equal(displayMatch(p,{...m,schedulePrecision:'DATE'},null).indicativeScore,0);
});
test('eligible pair keeps exactly the existing weighted score',()=>{
 const profile={...p,skills:['TRIAGE'],latitude:48,longitude:2,radiusKm:30,available:[slot]};
 const mission={...m,minExperienceMonths:0};
 const r=displayMatch(profile,mission,0);assert.equal(r.eligible,true);assert.equal(r.score,90);assert.equal(r.indicativeScore,r.score);
});
test('listing and detail share the same estimate; explicit missing distance stays unknown',()=>{
 const mission={id:'m_test',kind:'INTERNAL_MISSION',title:'Test',status:'OPEN',qualification:'IDE',service:'URGENCES',population:'ADULT',block:'NONE',specialty:null,required_skills:['TRIAGE'],desired_skills:['TRIAGE'],min_experience_months:12,start_at:slot.start,end_at:slot.end,shift:'DAY',latitude:48,longitude:2,matchingDistanceKm:null};
 const r=listingOrder(mission,p,new SearchDto(),Date.parse('2026-09-18'));
 assert.equal(r.matching_score,null);assert.equal(r.matching_indicative_score,displayMatch(p,m,null).indicativeScore);
});
test('RPPS and assignment conflicts remain visible and blocking despite an estimate',()=>{
 const r=displayMatch({...p,rppsStatus:'NOT_FOUND',conflicts:[slot]},m,null);
 assert.equal(r.eligible,false);assert.equal(r.score,null);assert.ok(r.reasons.includes('RPPS_NOT_FOUND'));assert.ok(r.reasons.includes('ASSIGNMENT_CONFLICT'));
 assert.ok(Number.isFinite(r.indicativeScore));
});
