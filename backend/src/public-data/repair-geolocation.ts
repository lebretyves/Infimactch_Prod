import {Database} from '../database/database';
import {enrichFranceTravailLocations,offerLocationCoordinates} from './offer-geolocation';
import {enrichJobsPipeLocations} from './jobspipe-geolocation';
import {parseOffer} from './offer-parser';

/** Retry missing locations independently of source pagination; never refresh availability. */
export async function repairOfferLocations(db:Database,provider:string){
 const rows=await db.query("SELECT id,title,description,source,qualification,location_label,provenance,parsed_offer FROM external_offer WHERE source=$1 AND active AND (provenance#>'{facts,location,coordinates}' IS NULL OR provenance#>'{facts,location,coordinates}'='null'::jsonb) AND CASE WHEN jsonb_typeof(provenance->'geolocationRetryAtMs')='number' THEN (provenance->>'geolocationRetryAtMs')::numeric<=$2 ELSE true END ORDER BY id LIMIT 150",[provider,Date.now()]);
 if(!rows.length)return {checked:0,located:0};
 const raw=rows.map(row=>({id:row.id,lieuTravail:{commune:row.provenance?.facts?.location?.commune},country_code:'FR',location:row.location_label,postal_code:row.provenance?.facts?.location?.postalCode}));
 const enriched=provider==='FRANCE_TRAVAIL'?await enrichFranceTravailLocations(raw,{maxRequests:100,budgetMs:12000}):await enrichJobsPipeLocations(raw,{maxRequests:100,budgetMs:12000});
 let located=0;
 const updates=rows.map((row,i)=>{
  const location=offerLocationCoordinates(enriched[i]);
  const provenance=structuredClone(row.provenance);
  provenance.geolocationRetryAtMs=Date.now()+6*3600000;
  if(location.coordinates){located++;provenance.facts={...provenance.facts,location:{...provenance.facts?.location,...location}};provenance.locationPrecision=location.precision;}
  return {id:row.id,previous:row.provenance,provenance,parsed:location.coordinates?parseOffer({...row,provenance}):row.parsed_offer};
 });
 await db.query("UPDATE external_offer e SET provenance=x.provenance,parsed_offer=x.parsed FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,previous jsonb,provenance jsonb,parsed jsonb) WHERE e.id=x.id AND e.active AND e.provenance=x.previous",[JSON.stringify(updates)]);
 return {checked:rows.length,located};
}
