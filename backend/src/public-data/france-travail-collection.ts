import {randomUUID} from 'node:crypto';
import {Database} from '../database/database';
import {FranceTravailClient,initialFtQueries,advanceFtQuery,type FtQuery} from './france-travail-client';
import {importOffers} from './offers';
import {enrichFranceTravailLocations} from './offer-geolocation';
export type FtCollectionState={version:1;id:string;day:string;slot?:string;mode?:'FULL'|'INCREMENTAL';phase:'IN_PROGRESS'|'COMPLETE'|'INCOMPLETE';startedAt:string;completedAt?:string;queue:FtQuery[];seen:string[];pages:number;accepted:number;rejected:number;partitions:number;error?:string};
const day=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
/** Latest scheduled slot, including Paris DST; no midnight reset before 07:00. */
export function ftCollectionSlot(now=new Date()):string {
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',hourCycle:'h23'}).format(now));
 return hour>=15?day(now)+':15':hour>=7?day(now)+':07':day(new Date(now.getTime()-12*3600000))+':15';
}
export function newFtCollection(now=new Date(),previous?:FtCollectionState):FtCollectionState {
 const slot=ftCollectionSlot(now);
 // Daily full collection also refreshes edits to old offers. Afternoon only
 // discovers new creations; a ten-minute overlap prevents boundary omissions.
 const incremental=slot.endsWith(':15')&&previous?.phase==='COMPLETE'&&previous.slot===day(now)+':07';
 const queue=initialFtQueries(now);
 if(incremental)for(const query of queue)query.min=new Date(Date.parse(previous!.startedAt)-600000).toISOString().replace(/\.\d{3}Z$/,'Z');
 return {version:1,id:randomUUID(),day:day(now),slot,mode:incremental?'INCREMENTAL':'FULL',phase:'IN_PROGRESS',startedAt:now.toISOString(),queue,seen:[],pages:0,accepted:0,rejected:0,partitions:0};
}
export function ftCoverage(s:FtCollectionState){return {id:s.id,phase:s.phase,mode:s.mode??'FULL',slot:s.slot??null,pages:s.pages,remainingQueries:s.queue.length,uniqueReceived:s.seen.length,accepted:s.accepted,rejected:s.rejected,partitions:s.partitions,startedAt:s.startedAt,completedAt:s.completedAt??null,error:s.error??null,scope:'France Travail MIS; infirmier/IDE/IADE/IBODE and ROME J1503/J1504/J1506; daily full collection and afternoon new creations; API-accessible offers, not a frozen snapshot'};}
export async function advanceFranceTravailCollection(db:Database,input:FtCollectionState|null,client=new FranceTravailClient(),manual=false,now=new Date()){
 let state=input?.version===1?structuredClone(input):newFtCollection(now);
 if(state.phase==='COMPLETE'){
  if(!manual&&(state.slot??ftCollectionSlot(new Date(state.startedAt)))===ftCollectionSlot(now))return {state,status:'UP_TO_DATE',accepted:0,coverage:ftCoverage(state)};
  state=newFtCollection(now,manual?undefined:state);
 }
 if(state.phase==='INCOMPLETE')return {state,status:'INCOMPLETE',accepted:0,coverage:ftCoverage(state)};
 const query=state.queue[0];if(!query)throw Error('FT_COLLECTION_STATE_INVALID');
 const page=await client.search(query,150);let next:FtQuery[];
 try{next=advanceFtQuery(query,page);}catch(e){state.phase='INCOMPLETE';state.error=e instanceof Error?e.message:'FT_PARTITION_FAILED';return {state,status:'INCOMPLETE',accepted:0,coverage:ftCoverage(state)};}
 const seen=new Set(state.seen),rows=page.rows.filter(row=>!seen.has(row.id));
 const summary=rows.length?await importOffers(db,await enrichFranceTravailLocations(rows),false):{accepted:0,rejected:[]};
 for(const row of page.rows)seen.add(row.id);
 state.seen=[...seen];state.queue.splice(0,1,...next);state.pages++;state.partitions+=Math.max(0,next.length-1);state.accepted+=summary.accepted;state.rejected+=summary.rejected.length;delete state.error;
 if(!state.queue.length){state.phase='COMPLETE';state.completedAt=now.toISOString();}
 return {state,status:state.phase==='COMPLETE'?'SUCCESS':'IN_PROGRESS',accepted:summary.accepted,coverage:ftCoverage(state)};
}
