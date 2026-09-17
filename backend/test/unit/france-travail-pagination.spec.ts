import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FranceTravailClient,advanceFtQuery,initialFtQueries} from '../../src/public-data/france-travail-client';
import {fetchOffers} from '../../src/public-data/offers';
async function credentials(work:()=>Promise<void>){const id=process.env.FT_CLIENT_ID,secret=process.env.FT_CLIENT_SECRET;process.env.FT_CLIENT_ID='fixture';process.env.FT_CLIENT_SECRET='fixture';try{await work();}finally{if(id===undefined)delete process.env.FT_CLIENT_ID;else process.env.FT_CLIENT_ID=id;if(secret===undefined)delete process.env.FT_CLIENT_SECRET;else process.env.FT_CLIENT_SECRET=secret;}}
test('all keyword pages are followed and duplicate provider IDs do not multiply offers',()=>credentials(async()=>{
 const ranges:string[]=[];const transport=(async(input:any)=>{const url=new URL(String(input));if(url.pathname.includes('access_token'))return Response.json({access_token:'fixture'});const range=url.searchParams.get('range')!;ranges.push(range);return range==='0-1'?Response.json({resultats:[{id:'A'},{id:'B'}]},{status:206,headers:{'Content-Range':'offres 0-1/3'}}):Response.json({resultats:[{id:'C'}]},{headers:{'Content-Range':'offres 2-2/3'}});})as typeof fetch;
 const rows=await fetchOffers(2,transport);assert.deepEqual(rows.map(x=>x.id),['A','B','C']);assert.equal(ranges.length,8);assert.equal(ranges.filter(x=>x==='2-3').length,4);
}));
test('saturated windows split dates with shared boundary and never report a saturated second complete',()=>{
 const query={keyword:'IDE',start:0,min:'2026-01-01T00:00:00Z',max:'2026-03-01T00:00:00Z'};
 const split=advanceFtQuery(query,{rows:[],total:4000,next:150});assert.equal(split.length,2);assert.equal(Date.parse(split[0]!.max!)-Date.parse(split[1]!.min!),1000);assert.ok(Date.parse(split[0]!.max!)<Date.parse(query.max));
 assert.throws(()=>advanceFtQuery({...query,max:'2026-01-01T00:00:01Z'},{rows:[],total:4000,next:150}),/INCOMPLETE/);
 assert.deepEqual(initialFtQueries().filter(q=>q.rome).map(q=>q.rome),['J1503','J1504','J1506']);
});
test('206 missing or inconsistent Content-Range cannot masquerade as a completed import',()=>credentials(async()=>{
 for(const headers of [new Headers(),new Headers({'Content-Range':'offres 5-5/10'})]){const transport=(async(input:any)=>String(input).includes('access_token')?Response.json({access_token:'fixture'}):Response.json({resultats:[{id:'A'}]},{status:206,headers}))as typeof fetch;await assert.rejects(new FranceTravailClient(transport,async()=>{}).search({keyword:'IDE',start:0}),/PAGINATION/);}
}));
test('provider throttling retries with the same page; detail 204 is preserved distinctly from search',()=>credentials(async()=>{
 let count=0;const transport=(async(input:any)=>{if(String(input).includes('access_token'))return Response.json({access_token:'fixture'});count++;if(count===1)return new Response(null,{status:429,headers:{'Retry-After':'1'}});return new Response(null,{status:204});})as typeof fetch;
 const client=new FranceTravailClient(transport,async()=>{});assert.equal((await client.detail('FIXTURE')).status,204);assert.equal(count,2);
}));
