import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repairOfferLocations} from '../../src/public-data/repair-geolocation';
test('location repair preserves availability and uses an optimistic provenance check',async()=>{
 const old=globalThis.fetch;globalThis.fetch=(async()=>Response.json({code:'75056',centre:{type:'Point',coordinates:[2.35,48.85]}})) as typeof fetch;
 try{
  const row={id:'00000000-0000-0000-0000-000000000001',source:'FRANCE_TRAVAIL',title:'IDE',description:'Mission interim',qualification:'IDE',location_label:'Paris',provenance:{facts:{location:{commune:'75056',label:'Paris',coordinates:null}},availabilityCheck:{status:'AVAILABLE'}},parsed_offer:null};
  let updates:any[]=[];
  const db={query:async(sql:string,args:any[])=>{
   if(sql.startsWith('SELECT'))return[row];
   assert.match(sql,/e.provenance=x.previous/);assert.match(sql,/e.active/);assert.ok(!sql.includes('imported_at=')&&!sql.includes('active='));updates=JSON.parse(args[0]);return[];
  }};
  const result=await repairOfferLocations(db as any,'FRANCE_TRAVAIL');assert.equal(result.located,1);
  assert.equal(updates[0].provenance.facts.location.precision,'COMMUNE_CENTRE');assert.deepEqual(updates[0].provenance.availabilityCheck,row.provenance.availabilityCheck);assert.ok(updates[0].parsed.inputHash);assert.equal(row.provenance.facts.location.coordinates,null);
 }finally{globalThis.fetch=old;}
});
