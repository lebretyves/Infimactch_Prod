import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from 'class-validator';
import { ReverseLocationDto, reverseLocation } from '../../src/listings/reverse-location';

const reply = (properties: unknown) => (async () => new Response(JSON.stringify({features:[{properties}]}))) as typeof fetch;
test('reverse lookup selects a street address without duplicating city/postcode or leaking provider data',async()=>{
 let requested='';
 const transport=(async(url:any)=>{requested=String(url);return new Response(JSON.stringify({features:[{properties:{type:'housenumber',name:'8 Place de la Mairie',city:'Paris',postcode:'75004',label:'8 Place de la Mairie 75004 Paris',distance:17,private:'discard'}}]}));}) as typeof fetch;
 assert.deepEqual(await reverseLocation(48.8566,2.3522,transport),{address:{address:'8 Place de la Mairie',city:'Paris',postalCode:'75004'},provider:'IGN'});
 const url=new URL(requested);assert.equal(url.origin,'https://data.geopf.fr');assert.equal(url.pathname,'/geocodage/reverse');assert.equal(url.searchParams.get('lat'),'48.8566');assert.equal(url.searchParams.get('lon'),'2.3522');assert.equal(url.searchParams.get('index'),'address');assert.equal(url.searchParams.get('limit'),'1');
});
test('no result and distant/invalid addresses stay unavailable; a commune never becomes a street',async()=>{
 for(const p of [undefined,{}, {city:'Paris',postcode:'invalid'}, {city:'Paris',postcode:'75004',distance:2000}])
  assert.deepEqual(await reverseLocation(48,2,reply(p)),{address:null,provider:'IGN'});
 assert.deepEqual(await reverseLocation(48,2,reply({type:'municipality',name:'Paris',city:'Paris',postcode:'75004'})),{address:{address:'',city:'Paris',postalCode:'75004'},provider:'IGN'});
 assert.deepEqual(await reverseLocation(48,2,(async()=>new Response('{"features":[]}')) as typeof fetch),{address:null,provider:'IGN'});
});
test('provider failure is explicit and does not expose internals',async()=>{
 for(const transport of [(async()=>new Response('{}',{status:503})),(async()=>new Response('{}')),(async()=>{throw Error('secret provider detail');})])
  await assert.rejects(()=>reverseLocation(48,2,transport as typeof fetch),(e:any)=>e.getStatus()===503&&!e.message.includes('secret'));
});
test('registration coordinates reject strings, missing, non-finite and out-of-range numbers',async()=>{
 assert.equal((await validate(Object.assign(new ReverseLocationDto(),{latitude:48,longitude:2}))).length,0);
 for(const coords of [{},{latitude:'48',longitude:2},{latitude:91,longitude:2},{latitude:48,longitude:181},{latitude:null,longitude:2},{latitude:NaN,longitude:2}])
  assert.ok((await validate(Object.assign(new ReverseLocationDto(),coords))).length);
});
