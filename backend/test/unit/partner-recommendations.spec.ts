import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RecommendationsController} from '../../src/listings/recommendations';
const start=new Date(Date.now()+86400000).toISOString(),end=new Date(Date.now()+115200000).toISOString();
const profile={qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],rpps_status:'NOT_CHECKED',latitude:48,longitude:2,radius_km:30,accepted_shifts:['DAY'],preferred_shifts:[]};
function mission(n:number,extra:any={}) {return {id:'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),title:'Mission',status:'OPEN',qualification:'IDE',service:'URGENCES',start_at:start,end_at:end,timezone:'Europe/Paris',hourly_salary:'25',version:1,required_skills:[],desired_skills:[],min_experience_months:0,population:'ADULT',block:'NONE',specialty:null,shift:'DAY',schedule_precision:'EXACT',latitude:48,longitude:2,published_at:'2026-01-01T00:00:00Z',distance:0,...extra};}
function fixture(rows:any[],p:any=profile,conflicts:any[]=[]) {
 const calls:{sql:string,args:any[]}[]=[];let lastBatch:any[]=[];
 const db:any={query:async(sql:string,args:any[]=[])=>{
  calls.push({sql,args});
  if(sql.includes('FROM profile'))return [p];
  if(sql.includes('FROM source_control'))return [];
  if(sql.includes('FROM assignment'))return conflicts;
  if(sql.includes('jsonb_to_recordset'))return JSON.parse(args[0]).map((_:any,i:number)=>({distance:lastBatch[i].distance}));
  if(sql.includes('FROM mission m')){
   assert.ok(sql.includes("m.status='OPEN'")&&sql.includes('m.start_at>now()')&&sql.includes('m.qualification=ANY($1::text[])'));
   lastBatch=rows.filter(m=>m.status==='OPEN'&&Date.parse(m.start_at)>Date.now()&&args[0].includes(m.qualification)&&m.id>args[1]).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,100);return lastBatch;
  }
  if(sql.startsWith('SET '))return [];
  throw Error('Unexpected query '+sql);
 }};
 db.transaction=async(fn:any)=>fn(db);
 return {calls,run:()=>new RecommendationsController(db).recommendations({session:{userId:'nurse'}} as any,{origine:'partenaires'})};
}
test('partner recommendations rank the best three below 100 even when eligibility is false',async()=>{
 const f=fixture([mission(1,{distance:28}),mission(2,{distance:15}),mission(3,{distance:1}),mission(4,{distance:5})]);
 const r:any=await f.run();assert.equal(r.internal.personalization,'INDICATIVE');
 assert.deepEqual(r.internal.items.map((m:any)=>m.id),[3,4,2].map(i=>'m_'+mission(i).id));
 assert.ok(r.internal.items.every((m:any)=>m.matching_score<100&&m.matching_eligible===false&&m.matching_reasons.includes('NOT_FULLY_AVAILABLE')));
 assert.ok(r.internal.items.every((m:any)=>m.matching_reasons.includes('RPPS_NOT_CHECKED')&&!('match_explanation_id' in m)));
 assert.equal(r.internal.items[0].salary.amount,25);assert.equal(r.external.status,'HIDDEN');
 assert.ok(f.calls.some(c=>c.sql.includes('REPEATABLE READ, READ ONLY')));
 assert.ok(f.calls.some(c=>c.sql.includes('statement_timeout')));
});
test('partner ranking scans later batches and filters closed, past and differently qualified missions',async()=>{
 const rows=Array.from({length:105},(_,i)=>mission(i+1,{distance:i<102?29:0}));
 rows.push(mission(106,{qualification:'IADE'}),mission(107,{status:'FILLED'}),mission(108,{start_at:'2020-01-01T00:00:00Z'}));
 const f=fixture(rows),r:any=await f.run();
 assert.deepEqual(r.internal.items.map((m:any)=>m.id),[103,104,105].map(i=>'m_'+mission(i).id));
 assert.equal(f.calls.filter(c=>c.sql.includes('jsonb_to_recordset')).length,2);
});
test('equal scores use recent publication then start date then stable id',async()=>{
 const r:any=await fixture([mission(1),mission(2,{published_at:'2026-02-01T00:00:00Z'}),mission(3,{published_at:'2026-02-01T00:00:00Z'}),mission(4,{published_at:'2026-02-01T00:00:00Z',start_at:new Date(Date.parse(start)+1000).toISOString()})]).run();
 assert.deepEqual(r.internal.items.map((m:any)=>m.id),[2,3,4].map(i=>'m_'+mission(i).id));
});
test('eligibility remains strict and includes active assignment conflicts',async()=>{
 const p={...profile,rpps_status:'FOUND',available:[{start,end}]};
 const good:any=await fixture([mission(1)],p).run();assert.equal(good.internal.items[0].matching_eligible,true);
 const bad:any=await fixture([mission(1)],p,[{start_at:start,end_at:end}]).run();
 assert.equal(bad.internal.items[0].matching_eligible,false);assert.ok(bad.internal.items[0].matching_reasons.includes('ASSIGNMENT_CONFLICT'));
});
test('empty partner catalogue returns ready without fabricated recommendations',async()=>{
 const r:any=await fixture([]).run();assert.equal(r.internal.status,'READY');assert.deepEqual(r.internal.items,[]);
});
