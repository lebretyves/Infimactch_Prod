import {Database} from "../database/database";
export const OFFER_FRESHNESS_DAYS=30;
/** Not seen recently is not a claim that the provider has closed the job. */
export async function retireStaleOffers(db:Database,apply=false){return db.transaction(async em=>{
 await em.query("SELECT pg_advisory_xact_lock(1789380901)");
 const rows=await em.query("SELECT id,CASE WHEN expires_at<=now() THEN 'OFFER_EXPIRED' ELSE 'STALE_UNVERIFIED' END AS reason FROM external_offer WHERE active AND (expires_at<=now() OR imported_at<now()-make_interval(days=>$1)) ORDER BY id FOR UPDATE",[OFFER_FRESHNESS_DAYS]);
 if(apply)for(const row of rows)await em.query("UPDATE external_offer SET active=false,provenance=jsonb_set(provenance,'{retiredReason}',to_jsonb($2::text)) WHERE id=$1",[row.id,row.reason]);
 return {dryRun:!apply,staleDays:OFFER_FRESHNESS_DAYS,expired:rows.filter(r=>r.reason==='OFFER_EXPIRED').length,unverified:rows.filter(r=>r.reason==='STALE_UNVERIFIED').length};
 });}
