require('../../backend/dist/config');require('reflect-metadata');
const {Database}=require('../../backend/dist/database/database');
const {MatchingService}=require('../../backend/dist/matching/matching.module');
const {AsyncLocalStorage}=require('node:async_hooks');const {performance}=require('node:perf_hooks');
const {execFileSync}=require('node:child_process');const {writeFileSync,readFileSync}=require('node:fs');const {resolve}=require('node:path');const {createHash}=require('node:crypto');const os=require('node:os');const assert=require('node:assert/strict');
const url=new URL(process.env.DATABASE_URL);assert.equal(process.env.NODE_ENV,'test');assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55433');assert.equal(url.pathname,'/infimatch_test');const mongo=new URL(process.env.MONGODB_URI);assert.equal(mongo.hostname,'127.0.0.1');assert.equal(mongo.port,'57018');assert.equal(mongo.pathname,'/infimatch_test');
globalThis.fetch=()=>{throw Error('Network providers forbidden in benchmark');};
const id=(group,n)=>`${group.toString().padStart(8,'0')}-0000-4000-8000-${n.toString().padStart(12,'0')}`;
const db=new Database(),context=new AsyncLocalStorage();let matching;
const resource=()=>{const out=execFileSync('docker',['exec',process.env.BENCH_PG_CONTAINER,'cat','/sys/fs/cgroup/cpu.stat','/sys/fs/cgroup/memory.current'],{encoding:'utf8'});return {cpuUsec:Number(out.match(/usage_usec (\d+)/)[1]),memoryBytes:Number(out.trim().split('\n').at(-1))};};
const digest=x=>createHash('sha256').update(JSON.stringify({total:x.total,excluded:x.excluded,items:x.items.map(({explanationId,historyStatus,...v})=>v)})).digest('hex');
async function seed(n){
 await db.query('TRUNCATE account,organization,mission CASCADE');await matching.runs.deleteMany({});
 const owner=id(1,1),org=id(2,1),start=new Date(Date.now()+30*86400000).toISOString(),end=new Date(Date.now()+30*86400000+8*3600000).toISOString();
 await db.query("INSERT INTO account(id,email,password_hash,family,terms_version) VALUES($1,'owner@example.invalid','fixture','ENTERPRISE','test')",[owner]);
 await db.query("INSERT INTO organization(id,kind,name,address,referent,finess) VALUES($1,'ESTABLISHMENT','Benchmark','Fictif','Fictif','000000000')",[org]);await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[owner,org]);
 const rows=Array.from({length:n},(_,i)=>({id:id(3,i+1),i:i+1}));
 await db.query("INSERT INTO account(id,email,password_hash,family,terms_version) SELECT id,id::text||'@example.invalid','fixture','NURSE','test' FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,i int)",[JSON.stringify(rows)]);
 await db.query("INSERT INTO profile(user_id,display_name,qualifications,rpps_status,visible,latitude,longitude,radius_km,accepted_shifts,preferred_shifts,available) SELECT id,'Fictif',ARRAY['IDE'],CASE WHEN i%5=0 THEN 'NOT_FOUND' ELSE 'FOUND' END,true,48,2+(i%10)*0.001,30,ARRAY['DAY'],ARRAY['DAY'],$2::jsonb FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,i int)",[JSON.stringify(rows),JSON.stringify([{start,end}])]);
 for(let i=1;i<=n;i++)await db.query("INSERT INTO mission(id,establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status) VALUES($1,$2,'Fictif','Fictif','IDE','MEDICINE','ADULT','NONE',$3,$4,'DAY','Fictif',ST_SetSRID(ST_MakePoint($5,48),4326)::geography,25,'OPEN')",[id(4,i),org,start,end,i%5===0?4:2+(i%10)*0.005]);
 // Ten percent of candidates have a real active assignment, in a separate filled mission.
 for(let i=1;i<=n;i+=10)await db.transaction(async em=>{
  const mission=id(5,i),application=id(6,i);
  await em.query("INSERT INTO mission(id,establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status) VALUES($1,$2,'Occupied','Fictif','IDE','MEDICINE','ADULT','NONE',$3,$4,'DAY','Fictif',ST_SetSRID(ST_MakePoint(2,48),4326)::geography,25,'FILLED')",[mission,org,start,end]);
  await em.query("INSERT INTO application(id,mission_id,nurse_id,consent_version,status) VALUES($1,$2,$3,1,'ACCEPTED')",[application,mission,id(3,i)]);
  await em.query('INSERT INTO assignment(mission_id,nurse_id,application_id,start_at,end_at) VALUES($1,$2,$3,$4,$5)',[mission,id(3,i),application,start,end]);
 });
 await db.query('ANALYZE');return {owner,nurse:id(3,2),mission:id(4,2)};
}
(async()=>{try{
 await db.connect();matching=new MatchingService(db);await matching.ready();
 const create=db.source.createQueryRunner.bind(db.source);db.source.createQueryRunner=(...args)=>{const runner=create(...args),query=runner.query.bind(runner);runner.query=async(sql,...args)=>{const m=context.getStore();const t=performance.now();if(m){m.sql++;if(/ST_Distance/.test(sql))m.distance++;if(/FROM assignment WHERE nurse_id/.test(sql))m.conflicts++;if(/BEGIN|START TRANSACTION|COMMIT/.test(sql))m.transactionStatements++;}try{return await query(sql,...args);}finally{if(m)m.sqlElapsedMs+=performance.now()-t;}};return runner;};
 const report={createdAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceFiles:Object.fromEntries(['backend/src/database/distance.ts','backend/src/matching/matching.module.ts'].map(file=>[file,createHash('sha256').update(readFileSync(resolve(__dirname,'../..',file))).digest('hex')])),environment:{node:process.version,platform:process.platform,cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,hostMemoryBytes:os.totalmem(),postgres:(await db.query('SELECT version() v'))[0].v,poolMax:12},scope:'Direct service calls, real isolated PostGIS and MongoDB; no HTTP/auth/network latency to production, no provider requests. Seed excluded from measurement. Three serial runs and one wave of five simultaneous calls, after warmup. PostgreSQL container CPU and memory include background activity; memory includes cache.',results:[],plans:[],indexes:[],businessResults:[]};
 for(const size of [100,1000]){
  const fixture=await seed(size);
  for(const mode of ['forNurse','forMission']){
   const invoke=offset=>mode==='forNurse'?matching.forNurse(fixture.nurse,{limit:20,offset}):matching.forMission(fixture.owner,fixture.mission,{limit:20,offset});
   const warm=await invoke(0);assert.equal(warm.total,size*(mode==='forNurse'?.8:.7));assert.equal(warm.items.length,20);const expected=digest(warm);
   const second=await invoke(20);assert.equal(second.items.length,20);const key=x=>x.missionId||x.candidateId;assert.equal(new Set([...warm.items,...second.items].map(key)).size,40);
   report.businessResults.push({size,mode,first:digest(warm),second:digest(second)});
   if(mode==='forNurse'){for(const offset of [0,20])report.businessResults.push({size,mode:'recent',offset,digest:digest(await matching.forNurse(fixture.nurse,{limit:20,offset},'recent'))});}
   for(const concurrency of [1,5]){
    const before=resource();let peak=process.memoryUsage().rss;const memoryStart=peak;const sampler=setInterval(()=>peak=Math.max(peak,process.memoryUsage().rss),20);const cpu=process.cpuUsage(),t=performance.now();const runs=[];
    const once=async()=>{const metric={sql:0,distance:0,conflicts:0,transactionStatements:0,sqlElapsedMs:0};const started=performance.now();const result=await context.run(metric,()=>invoke(0));assert.equal(digest(result),expected);assert.equal(result.items.every(x=>x.eligible),true);metric.responseMs=performance.now()-started;if(process.env.BENCH_COMPARE_BASELINE==='1'){assert.ok(metric.distance<=Math.ceil(size/100));assert.ok(metric.conflicts<=(mode==='forNurse'?1:Math.ceil(size/100)));}metric.total=result.total;metric.excluded=result.excluded;metric.returned=result.items.length;runs.push(metric);};
    try{if(concurrency===1){for(let i=0;i<3;i++)await once();}else await Promise.all(Array.from({length:5},once));}finally{clearInterval(sampler);peak=Math.max(peak,process.memoryUsage().rss);}
    const wallMs=performance.now()-t,nodeCpu=process.cpuUsage(cpu),after=resource();report.results.push({size,mode,concurrency,wallMs,nodeCpuMs:(nodeCpu.user+nodeCpu.system)/1000,nodeRssStartBytes:memoryStart,nodeRssPeakBytes:peak,postgresCpuMs:(after.cpuUsec-before.cpuUsec)/1000,postgresCpuCorePercent:(after.cpuUsec-before.cpuUsec)/1000/wallMs*100,postgresMemoryStartBytes:before.memoryBytes,postgresMemoryEndBytes:after.memoryBytes,runs});console.log(size,mode,concurrency,JSON.stringify(runs.map(x=>({ms:Math.round(x.responseMs),queries:x.sql}))));
   }
  }
  if(size===1000){for(const [label,sql,params] of [
   ['conflict-lookup',"SELECT start_at,end_at FROM assignment WHERE nurse_id=$1 AND status='ACTIVE'",[id(3,1)]],
   ['candidate-batch',"SELECT p.* FROM profile p JOIN account a ON a.id=p.user_id AND a.active WHERE p.visible AND $1=ANY(p.qualifications) AND p.user_id>$2::uuid ORDER BY p.user_id LIMIT 100",['IDE','00000000-0000-0000-0000-000000000000']],
   ['mission-batch',"SELECT m.* FROM mission m WHERE m.status='OPEN' AND m.start_at>now() AND m.qualification=ANY($1) AND m.id>$2::uuid ORDER BY m.id LIMIT 100",[['IDE'],'00000000-0000-0000-0000-000000000000']]
  ])report.plans.push({label,plan:await db.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+sql,params)});}
 }
 report.indexes=await db.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN('assignment','mission','profile','account') ORDER BY tablename,indexname");
 if(process.env.BENCH_COMPARE_BASELINE==='1'){const baseline=JSON.parse(readFileSync(resolve(process.env.BENCH_PROOF,'baseline.json'),'utf8'));assert.deepEqual(report.businessResults,baseline.businessResults);report.baselineComparison='PASS: exact business fingerprints for first and second pages, both directions and recent sorting';}
 writeFileSync(resolve(process.env.BENCH_PROOF,'results.json'),JSON.stringify(report,null,2)+'\n');console.log('Benchmark PASS; stable results and disjoint pages, business outputs recorded');
}finally{await matching?.onModuleDestroy();await db.onModuleDestroy();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
