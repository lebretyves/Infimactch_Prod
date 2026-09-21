import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plainToInstance} from 'class-transformer';
import {validateSync} from 'class-validator';
import {SearchDto,searchSql} from '../../src/listings/search';
import {compareListingOrder,listingOrder} from '../../src/listings/listing-order';
import {Professional} from '../../src/domain/matching';
const now=Date.parse('2026-09-17T12:00:00Z');
const p:Professional={qualifications:['IDE'],skills:[],experience:[],available:[{start:'2037-01-10T08:00:00Z',end:'2037-01-10T16:00:00Z'}],unavailable:[],conflicts:[],rppsStatus:'FOUND',latitude:48,longitude:2,radiusKm:30,acceptedShifts:['DAY'],preferredShifts:[]};
const mission={id:'m_1',kind:'INTERNAL_MISSION',created_at:'2026-09-15T00:00:00Z',start_at:'2037-01-10T08:00:00Z',end_at:'2037-01-10T16:00:00Z',status:'OPEN',qualification:'IDE',service:'URGENCES',population:'ADULT',block:'NONE',specialty:null,required_skills:[],desired_skills:[],min_experience_months:0,latitude:48,longitude:2,shift:'DAY'};
const search:SearchDto={qualifications:['IDE']};
test('search accepts only supported sorts and publication windows, and paired distance centre without radius',()=>{
 for(const body of [{sort:'sql injection'},{publishedWithinDays:2},{availableOnly:'true'}])assert.ok(validateSync(plainToInstance(SearchDto,{...search,...body})).length);
 assert.equal(validateSync(plainToInstance(SearchDto,{...search,sort:'recent',publishedWithinDays:7,availableOnly:true})).length,0);
 assert.doesNotThrow(()=>searchSql({...search,sort:'distance',latitude:48,longitude:2}));
 for(const body of [{sort:'distance' as const},{latitude:48},{radiusKm:25}])assert.throws(()=>searchSql({...search,...body}));
});
test('external date is source publication, never import date; missing facts stay unknown',()=>{
 const external=listingOrder({id:'e_1',kind:'EXTERNAL_OFFER',title:'Infirmier',imported_at:'2026-09-17T11:00:00Z',provenance:{publishedAt:'2026-01-01T00:00:00Z'}},p,search,now);
 assert.equal(external.publicationDate,'2026-01-01T00:00:00.000Z');assert.equal(external.availabilityCompatible,null);assert.equal(external.matching_score,null);assert.equal(external.distanceKm,null);
 for(const value of ['bad date','2999-01-01T00:00:00Z',undefined])assert.equal(listingOrder({id:'e_2',kind:'EXTERNAL_OFFER',provenance:{publishedAt:value}},p,search,now).publicationDate,null);
});
test('availability honors contiguous periods, explicit unavailability and confirmed conflicts',()=>{
 assert.equal(listingOrder(mission,p,search,now).availabilityCompatible,true);
 const unavailable=[{start:'2037-01-10T12:00:00Z',end:'2037-01-10T13:00:00Z'}];
 assert.equal(listingOrder(mission,{...p,unavailable},search,now).availabilityCompatible,false);
 assert.equal(listingOrder(mission,{...p,conflicts:unavailable},search,now).availabilityCompatible,false);
 assert.equal(listingOrder(mission,{...p,available:[]},search,now).availabilityCompatible,false);
});
test('sorting is deterministic and uses requested location without changing profile correspondence',()=>{
 const near=listingOrder(mission,p,search,now),far=listingOrder({...mission,id:'m_2',longitude:4},p,search,now);
 assert.ok(compareListingOrder(near,far,'distance')<0);assert.ok(compareListingOrder(near,far,'relevance')<0);
 const fromElsewhere=listingOrder(mission,p,{...search,latitude:48,longitude:4},now);assert.ok(fromElsewhere.distanceKm!>100);assert.equal(fromElsewhere.matching_score,near.matching_score);
 const unknown=listingOrder({id:'e_1',kind:'EXTERNAL_OFFER'},p,search,now);assert.ok(compareListingOrder(near,unknown,'distance')<0);assert.ok(compareListingOrder(near,unknown,'start')<0);
 assert.ok(compareListingOrder(near,{...near,id:'m_3'},'recent')<0);
});

test('partner correspondence uses the database geodesic distance at radius boundaries',()=>{
 const r=listingOrder({...mission,matchingDistanceKm:31},p,search,now);assert.equal(r.matching_score,null);
 assert.equal(listingOrder({...mission,matchingDistanceKm:29},p,search,now).matching_score!==null,true);
});

test('matching sort ranks displayed percentages, including incomplete profiles, before pagination',()=>{
 const base=listingOrder(mission,{...p,available:[]},search,now);
 assert.equal(base.matching_score,null);
 assert.equal(typeof base.matching_indicative_score,'number');
 const high=listingOrder(mission,{...p,available:[]},search,now);
 const low=listingOrder({...mission,id:'m_low',longitude:4},{...p,available:[]},search,now);
 assert.ok(high.matching_indicative_score!>low.matching_indicative_score!);
 assert.ok(compareListingOrder(high,low,'relevance')<0);
 const external=listingOrder({id:'e_1',kind:'EXTERNAL_OFFER'},p,search,now);
 assert.ok(compareListingOrder(low,external,'relevance')<0);
});

test('morning and afternoon filters are valid and a day search includes both slots',()=>{
 for(const shift of ['MORNING','AFTERNOON']) {
  assert.equal(validateSync(plainToInstance(SearchDto,{...search,shifts:[shift]})).length,0);
  assert.ok(JSON.stringify(searchSql({...search,shifts:[shift]})).includes(shift));
 }
 const day=JSON.stringify(searchSql({...search,shifts:['DAY']}));
 assert.ok(day.includes('MORNING'));assert.ok(day.includes('AFTERNOON'));
 assert.ok(validateSync(plainToInstance(SearchDto,{...search,shifts:['INVALID']})).length);
});
