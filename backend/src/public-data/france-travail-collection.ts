import {randomUUID} from 'node:crypto';
import {Database} from '../database/database';
import {FranceTravailClient,initialFtQueries,advanceFtQuery,type FtQuery} from './france-travail-client';
import {importOffers} from './offers';
import {enrichFranceTravailLocations} from './offer-geolocation';
export type FtCollectionState={version:1;id:string;day:string;phase:'IN_PROGRESS'|'COMPLETE'|'INCOMPLETE';startedAt:string;completedAt?:string;queue:FtQuery[];seen:string[];pages:number;accepted:number;rejected:number;partitions:number;error?:string};
const day=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function newFtCollection(now=new Date()):FtCollectionState{return {version:1,id:randomUUID(),day:day(now),phase:'IN_PROGRESS',startedAt:now.toISOString(),queue:initialFtQueries(now),seen:[],pages:0,accepted:0,rejected:0,partitions:0};}
export function ftCoverage(s:FtCollectionState){return {id:s.id,phase:s.phase,pages:s.pages,remainingQueries:s.queue.length,uniqueReceived:s.seen.length,accepted:s.accepted,rejected:s.rejected,partitions:s.partitions,startedAt:s.startedAt,completedAt:s.completedAt??null,error:s.error??null,scope:'France Travail MIS; infirmier/IDE/IADE/IBODE and ROME J1503/J1504/J1506; creation 1970 to cycle start; API-accessible offers, not a frozen snapshot'};}
export async function advanceFranceTravailCollection(db:Database,input:FtCollectionState|null,client=new FranceTravailClient(),manual=false){
 let state=input?.version===1?structuredClone(input):newFtCollection();
 if(state.phase==='COMPLETE'){
  if(!manual&&state.day===day(new Date()))return {state,status:'UP_TO_DATE',accepted:0,coverage:ftCoverage(state)};
  state=newFtCollection();
 }
 if(state.phase==='INCOMPLETE')return {state,status:'INCOMPLETE',accepted:0,coverage:ftCoverage(state)};
 const query=state.queue[0];if(!query)throw Error('FT_COLLECTION_STATE_INVALID');
 const page=await client.search(query,150);let next:FtQuery[];
 try{next=advanceFtQuery(query,page);}catch(e){state.phase='INCOMPLETE';state.error=e instanceof Error?e.message:'FT_PARTITION_FAILED';return {state,status:'INCOMPLETE',accepted:0,coverage:ftCoverage(state)};}
 const seen=new Set(state.seen),rows=page.rows.filter(row=>!seen.has(row.id));
 const summary=rows.length?await importOffers(db,await enrichFranceTravailLocations(rows),false):{accepted:0,rejected:[]};
 for(const row of page.rows)seen.add(row.id);
 state.seen=[...seen];state.queue.splice(0,1,...next);state.pages++;state.partitions+=Math.max(0,next.length-1);state.accepted+=summary.accepted;state.rejected+=summary.rejected.length;delete state.error;
 if(!state.queue.length){state.phase='COMPLETE';state.completedAt=new Date().toISOString();}
 return {state,status:state.phase==='COMPLETE'?'SUCCESS':'IN_PROGRESS',accepted:summary.accepted,coverage:ftCoverage(state)};
}
