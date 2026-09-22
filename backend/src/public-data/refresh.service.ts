import {repairOfferLocations} from "./repair-geolocation";
import {BadRequestException,Injectable,Module} from '@nestjs/common';
import {Database} from '../database/database';
import {importOffers} from './offers';
import {FranceTravailClient} from './france-travail-client';
import {advanceFranceTravailCollection} from './france-travail-collection';
import {retireStaleOffers,verifyClosedFranceTravailOffers} from './freshness';
import {guardCrossSourceDuplicates} from './offer-deduplication';
import {normalizeJobsPipe} from './jobspipe';
import {advanceJobsPipeCollection,verifyJobsPipeOffers} from './jobspipe-collection';
import {enrichJobsPipeLocations} from './jobspipe-geolocation';

export const PROVIDERS=['FRANCE_TRAVAIL','JOBSPIPE'] as const;
export type Provider=typeof PROVIDERS[number];
export function providerName(value:string):Provider {
  if(!(PROVIDERS as readonly string[]).includes(value))throw new BadRequestException('Source inconnue.');
  return value as Provider;
}

@Injectable()
export class RefreshService {
  constructor(private readonly db:Database){}
  async runBatch(provider:Provider) {
    const deadline=Date.now()+70000;
    let result=await this.run(provider), accepted=result.accepted, batches=1;
    while(result.status==='IN_PROGRESS' && batches<12 && Date.now()<deadline){
      result=await this.run(provider);accepted+=result.accepted;batches++;
    }
    const geolocation = accepted === 0 || result.status === "PAUSED" || result.status === "BUSY" ? null : await repairOfferLocations(this.db,provider);
    return {...result,accepted,batches,geolocation};
  }
  async run(provider:Provider,manual=false) {
    // Hold only the provider/control lock across acquisition. Catalogue writes use
    // separate short transactions, committed before the next provider request.
    // A failed checkpoint may replay a page; import upserts are idempotent.
    return this.db.transaction(async em=>{
      const [lock]=await em.query('SELECT pg_try_advisory_xact_lock($1) AS acquired',[provider==='FRANCE_TRAVAIL'?1789381901:1789381902]);
      if(!lock.acquired)return {provider,status:'BUSY',accepted:0};
      const [control]=await em.query('SELECT enabled,last_started_at,collection_state FROM source_control WHERE provider=$1 FOR UPDATE',[provider]);
      if(!control)throw Error('SOURCE_CONTROL_MISSING');
      if(!manual&&!control.enabled)return {provider,status:'PAUSED',accepted:0};
      if(control.collection_state?.phase!=='IN_PROGRESS'&&!(control.collection_state?.cycleId&&!control.collection_state?.completedAt&&!control.collection_state?.terminal)&&control.last_started_at&&Date.now()-new Date(control.last_started_at).getTime()<60000)return {provider,status:'COOLDOWN',accepted:0};
      await em.query('UPDATE source_control SET last_started_at=now() WHERE provider=$1',[provider]);
      try {
        if(provider==='FRANCE_TRAVAIL'){
          const client=new FranceTravailClient();
          const result=await advanceFranceTravailCollection(this.db,control.collection_state,client,manual);
          await em.query('UPDATE source_control SET collection_state=$2 WHERE provider=$1',[provider,JSON.stringify(result.state)]);
          const availability=result.state.phase==='COMPLETE'?await verifyClosedFranceTravailOffers(this.db,id=>client.detail(id),{limit:25,recheckClosed:true,notImportedSince:new Date(result.state.startedAt)}):{deferredUntilCollectionComplete:true};
          const freshness=await retireStaleOffers(this.db,true);if ('reopened' in availability && availability.reopened) await this.db.transaction(async catalogue=>{await catalogue.query('SELECT pg_advisory_xact_lock(1789380901)');await guardCrossSourceDuplicates(catalogue);});
          return {provider,status:result.status,accepted:result.accepted,coverage:result.coverage,availability,freshness};
        }
        const result=await advanceJobsPipeCollection(this.db,control.collection_state,{manual});
        const summary=result.rows.length?await importOffers(this.db,await enrichJobsPipeLocations(result.rows),false,normalizeJobsPipe,'JOBSPIPE'):null;
        await em.query('UPDATE source_control SET collection_state=$2 WHERE provider=$1',[provider,JSON.stringify(result.state)]);
        let availability:any=null;
        if(result.status==='COMPLETE'||(result.status==='COOLDOWN'&&result.state.completedAt)){
          const candidates=await this.db.query("SELECT source_id FROM external_offer WHERE source='JOBSPIPE' AND active AND (CASE WHEN jsonb_typeof(provenance->'availabilityCheck'->'nextCheckAtMs')='number' THEN (provenance->'availabilityCheck'->>'nextCheckAtMs')::numeric ELSE 0 END)<$1 ORDER BY imported_at,source_id LIMIT 25",[Date.now()]);
          if(candidates.length){
            const ids=candidates.map(x=>x.source_id),check=await verifyJobsPipeOffers(this.db,ids,{requestId:new Date().toISOString().slice(0,10)+':'+ids.join('|')});
            if(check.rows.length){
              await importOffers(this.db,await enrichJobsPipeLocations(check.rows),false,normalizeJobsPipe,'JOBSPIPE');
              await this.db.query("UPDATE external_offer SET provenance=jsonb_set(provenance,'{availabilityCheck}',jsonb_build_object('status','PROVIDER_RECORD_CHECKED','checkedAtMs',$2::bigint,'nextCheckAtMs',$2::bigint+604800000)) WHERE source='JOBSPIPE' AND source_id=ANY($1::text[])",[check.rows.map(x=>x.id),Date.now()]);
            }
            if(check.status==='COMPLETE'){const returned=new Set(check.rows.map(x=>x.id));const missing=ids.filter(x=>!returned.has(x));if(missing.length)await this.db.query("UPDATE external_offer SET provenance=jsonb_set(provenance,'{availabilityCheck}',jsonb_build_object('status','NOT_RETURNED_UNVERIFIED','checkedAtMs',$2::bigint,'nextCheckAtMs',$2::bigint+604800000)) WHERE source='JOBSPIPE' AND source_id=ANY($1::text[])",[missing,Date.now()]);}
            availability={status:check.status,checked:check.rows.length,missingMeansClosed:false};
          }
        }
        const freshness=await retireStaleOffers(this.db,true);
        return {provider,status:result.status==='CONTINUE'?'IN_PROGRESS':result.status==='COMPLETE'?'SUCCESS':result.status,accepted:summary?.accepted??0,coverage:result.coverage,availability,freshness};
      } catch (error) {
        await em.query("INSERT INTO import_run(provider,status,summary) VALUES($1,'FAILED',$2)",[provider,JSON.stringify({code:'PROVIDER_REFRESH_FAILED',reason:error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:undefined,incomplete:true})]);
        return {provider,status:'RETRY_REQUIRED',accepted:0};
      }
    });
  }
}
@Module({providers:[RefreshService],exports:[RefreshService]})
export class RefreshModule {}
