import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ftCollectionSlot,newFtCollection,advanceFranceTravailCollection} from '../../src/public-data/france-travail-collection';

test('Paris import slots respect summer/winter time and do not reset at midnight',()=>{
 for(const [date,slot] of [
  ['2026-09-19T04:59:00Z','2026-09-18:15'],['2026-09-19T05:00:00Z','2026-09-19:07'],
  ['2026-09-19T12:59:00Z','2026-09-19:07'],['2026-09-19T13:00:00Z','2026-09-19:15'],
  ['2026-09-19T23:00:00Z','2026-09-19:15'],['2026-12-19T06:00:00Z','2026-12-19:07'],
  ['2026-03-29T05:00:00Z','2026-03-29:07'],['2026-10-25T06:00:00Z','2026-10-25:07'],
  ] as const)assert.equal(ftCollectionSlot(new Date(date)),slot);
});
test('afternoon queries only new creations after a complete morning; next morning reconciles all edits',()=>{
 const morning=newFtCollection(new Date('2026-09-19T05:00:00Z'));morning.phase='COMPLETE';
 const afternoon=newFtCollection(new Date('2026-09-19T13:00:00Z'),morning);
 assert.equal(afternoon.mode,'INCREMENTAL');assert.equal(afternoon.slot,'2026-09-19:15');
 assert.ok(afternoon.queue.every(q=>q.min==='2026-09-19T04:50:00Z'&&q.max==='2026-09-19T13:00:00Z'));
 afternoon.phase='COMPLETE';const next=newFtCollection(new Date('2026-09-20T05:00:00Z'),afternoon);
 assert.equal(next.mode,'FULL');assert.ok(next.queue.every(q=>q.min==='1970-01-01T00:00:00Z'));
 const missed=newFtCollection(new Date('2026-09-20T13:00:00Z'),morning);assert.equal(missed.mode,'FULL');
});
test('a completed slot never repeats while an unfinished cycle keeps its checkpoint across slots',async()=>{
 const now=new Date('2026-09-19T05:00:00Z'),state=newFtCollection(now);state.phase='COMPLETE';state.queue=[];
 let calls=0;const client={search:async()=>{calls++;return {rows:[],total:0,next:null};}} as any;
 assert.equal((await advanceFranceTravailCollection({} as any,state,client,false,new Date('2026-09-19T08:00:00Z'))).status,'UP_TO_DATE');assert.equal(calls,0);
 const afternoon=await advanceFranceTravailCollection({} as any,state,client,false,new Date('2026-09-19T13:00:00Z'));
 assert.equal(calls,1);assert.equal(afternoon.state.mode,'INCREMENTAL');
 const pending=newFtCollection(now);pending.pages=12;pending.queue=[{keyword:'IADE',start:150,min:'1970-01-01T00:00:00Z'}];
 const result=await advanceFranceTravailCollection({} as any,pending,{search:async(q:any)=>{assert.equal(q.start,150);return {rows:[],total:0,next:null};}} as any,false,new Date('2026-09-19T13:00:00Z'));
 assert.equal(result.state.id,pending.id);assert.equal(result.state.pages,13);assert.equal(result.status,'SUCCESS');
});

