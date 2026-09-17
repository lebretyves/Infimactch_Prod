import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findLocations} from '../../src/listings/locations';
test('location search uses the fixed provider and selects bounded valid coordinates',async()=>{
 let requested='';const transport=(async (url:any)=>{requested=String(url);return new Response(JSON.stringify({features:[{geometry:{type:'Point',coordinates:[4.835,45.758]},properties:{label:'Lyon',secret:'discard'}},{geometry:{type:'Point',coordinates:[500,45]},properties:{label:'Invalid'}},{geometry:{type:'Point',coordinates:['2',48]},properties:{label:'Invalid'}}]}));}) as typeof fetch;
 const result=await findLocations('Lyon & limit=100',transport);const url=new URL(requested);assert.equal(url.origin,'https://data.geopf.fr');assert.equal(url.searchParams.get('q'),'Lyon & limit=100');assert.equal(url.searchParams.get('limit'),'5');assert.deepEqual(result,{provider:'IGN',items:[{label:'Lyon',latitude:45.758,longitude:4.835}]});
});
test('location provider errors are explicit and never a fabricated empty success',async()=>{
 for(const transport of [(async()=>new Response('{}',{status:503})),(async()=>new Response('{}')),(async()=>{throw Error('private provider detail');})])await assert.rejects(()=>findLocations('Paris',transport as typeof fetch),(error:any)=>error.getStatus()===503&&!error.message.includes('private provider detail'));
});
