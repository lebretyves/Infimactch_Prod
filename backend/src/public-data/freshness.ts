import {Database} from "../database/database";
export const OFFER_FRESHNESS_DAYS=30;
const HOUR_MS=60*60*1000;
const DAY_MS=24*HOUR_MS;
// JSON metadata is internal, but malformed historic/provider metadata must never
// make the maintenance query fail or force a timestamp cast.
const verifiedAtSql="CASE WHEN jsonb_typeof(provenance->'availabilityCheck'->'verifiedAtMs')='number' THEN (provenance->'availabilityCheck'->>'verifiedAtMs')::numeric ELSE 0 END";
const nextCheckSql="CASE WHEN jsonb_typeof(provenance->'availabilityCheck'->'nextCheckAtMs')='number' THEN (provenance->'availabilityCheck'->>'nextCheckAtMs')::numeric ELSE 0 END";
/** Neither an old import nor the absence of recent verification proves closure. */
export async function retireStaleOffers(db:Database,apply=false){return db.transaction(async em=>{
 await em.query("SELECT pg_advisory_xact_lock(1789380901)");
 const rows=await em.query(`SELECT id,CASE WHEN expires_at<=now() THEN 'OFFER_EXPIRED' ELSE 'STALE_UNVERIFIED' END AS reason FROM external_offer WHERE active AND (expires_at<=now() OR (imported_at<now()-make_interval(days=>$1) AND (${verifiedAtSql})<extract(epoch FROM now()-make_interval(days=>$1))*1000)) ORDER BY id FOR UPDATE`,[OFFER_FRESHNESS_DAYS]);
 if(apply)for(const row of rows)await em.query("UPDATE external_offer SET active=false,provenance=jsonb_set(coalesce(provenance,'{}'::jsonb),'{retiredReason}',to_jsonb($2::text)) WHERE id=$1",[row.id,row.reason]);
 return {dryRun:!apply,staleDays:OFFER_FRESHNESS_DAYS,expired:rows.filter(r=>r.reason==='OFFER_EXPIRED').length,unverified:rows.filter(r=>r.reason==='STALE_UNVERIFIED').length};
 });}

/** The shared FT client owns OAuth, URL construction, timeouts and transport.
 * Only the status of the authenticated single-offer endpoint is consumed here.
 * France Travail documents absence as 204 on this endpoint only; a search
 * 204 or an HTTP 404/410 error is not proof that an individual offer closed.
 */
export type OfferDetailStatus=(sourceId:string)=>Promise<{status:number;body?:{cancel:()=>Promise<unknown>}|null}>;
type Candidate={id:string;source_id:string;imported_at_snapshot:string;raw_hash:string;active:boolean};
export type AvailabilityOptions={limit?:number;now?:Date;recheckClosed?:boolean;notImportedSince?:Date};
export async function verifyClosedFranceTravailOffers(
 db:Database,
 getDetail:OfferDetailStatus,
 options:AvailabilityOptions={},
){
 return verifyClosedProviderOffers(db,'FRANCE_TRAVAIL',getDetail,{...options,missingStatus:204});
}

/** Only wire a provider here after its official detail absence status is verified. */
export async function verifyClosedProviderOffers(
 db:Database,provider:'FRANCE_TRAVAIL'|'JOBSPIPE',getDetail:OfferDetailStatus,
 options:AvailabilityOptions&{missingStatus:204|404|410},
){
 const limit=options.limit??25, now=options.now??new Date(), nowMs=now.getTime();
 if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isFinite(nowMs)||(options.notImportedSince!==undefined&&!Number.isFinite(options.notImportedSince.getTime()))||(provider==='FRANCE_TRAVAIL'&&options.missingStatus!==204))throw new Error('INVALID_AVAILABILITY_CHECK_OPTIONS');
 const rows:Candidate[]=await db.query(`SELECT id,source_id,imported_at::text AS imported_at_snapshot,raw_hash,active FROM external_offer WHERE source=$3 AND ((active AND ($5::timestamptz IS NULL OR imported_at<$5::timestamptz)) OR ($4 AND NOT active AND provenance->>'retiredReason'='PROVIDER_CLOSED')) AND (expires_at IS NULL OR expires_at>now()) AND (${nextCheckSql})<=$1 ORDER BY (${nextCheckSql}),id LIMIT $2`,[nowMs,limit,provider,options.recheckClosed??false,options.notImportedSince?.toISOString()??null]);
 const summary={checked:0,closed:0,available:0,reopened:0,retry:0,skipped:0,deferred:0};
 for(const row of rows){
  let status:number|null=null;
  try{const response=await getDetail(row.source_id);if(Number.isInteger(response.status))status=response.status;await response.body?.cancel().catch(()=>{});}catch{/* No transport error may be treated as a closure. */}
  summary.checked++;
  const closed=status===options.missingStatus, available=status===200, reopen=!row.active&&available;
  const outcome=closed?'CLOSED':available?'AVAILABLE':'RETRY_REQUIRED';
  const metadata={status:outcome,httpStatus:status,checkedAtMs:nowMs,nextCheckAtMs:nowMs+(available||closed?DAY_MS:HOUR_MS),...(available?{verifiedAtMs:nowMs,closedAtMs:null}:closed?{closedAtMs:nowMs}:{})};
  // No row lock is held during network I/O. A reimport, retirement or newer
  // verification invalidates this snapshot; never overwrite its fresh result.
  const changed=await db.query(`UPDATE external_offer SET active=CASE WHEN $5 THEN false WHEN $10 THEN true ELSE active END,provenance=(jsonb_set(coalesce(provenance,'{}'::jsonb),'{availabilityCheck}',CASE WHEN jsonb_typeof(provenance->'availabilityCheck')='object' THEN provenance->'availabilityCheck' ELSE '{}'::jsonb END||$6::jsonb)||CASE WHEN $5 THEN jsonb_build_object('retiredReason','PROVIDER_CLOSED') ELSE '{}'::jsonb END)-CASE WHEN $10 THEN ARRAY['retiredReason']::text[] ELSE ARRAY[]::text[] END WHERE id=$1 AND source=$8 AND source_id=$2 AND active=$9 AND imported_at=$3::timestamptz AND raw_hash=$4 AND (${nextCheckSql})<=$7 AND (NOT $10 OR expires_at IS NULL OR expires_at>now()) RETURNING id`,[row.id,row.source_id,row.imported_at_snapshot,row.raw_hash,closed,JSON.stringify(metadata),nowMs,provider,row.active,reopen]);
  if(!changed.length)summary.skipped++;
  else if(closed)summary.closed++;
  else if(available){summary.available++;if(reopen)summary.reopened++;}
  else summary.retry++;
  // Authentication/rate-limit/provider outages are source-wide: avoid spending
  // the rest of the batch on the same failure and retain every unchecked row.
  if(status===null||status===401||status===403||status===429||(status>=500&&status<=599))break;
 }
 summary.deferred=rows.length-summary.checked;
 return summary;
}
