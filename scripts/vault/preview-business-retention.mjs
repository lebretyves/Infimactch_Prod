import {withRole,request} from './common.mjs';import {managedPostgresConnection} from './postgres-target.mjs';import {createRequire} from 'node:module';
const {Client}=createRequire(import.meta.url)('pg');
const days=Number(process.argv[2]);if(!Number.isSafeInteger(days)||days<1||days>36500)throw Error('Specify a proposed retention in days (1..36500)');
try{await withRole('operator',async token=>{
 const v=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 const db=new Client({...managedPostgresConnection(v.DATABASE_URL,v.DATABASE_CA_CERT),statement_timeout:15000});await db.connect();
 try{await db.query('BEGIN READ ONLY');
 const {rows:[counts]}=await db.query(`WITH expired AS (SELECT id FROM mission m WHERE m.status IN('COMPLETED','CANCELLED') AND m.end_at<now()-make_interval(days=>$1) AND NOT EXISTS(SELECT 1 FROM assignment a WHERE a.mission_id=m.id AND a.status='ACTIVE'))
 SELECT (SELECT count(*)::int FROM expired) missions,(SELECT count(*)::int FROM assignment WHERE mission_id IN(SELECT id FROM expired)) assignments,(SELECT count(*)::int FROM document WHERE assignment_id IN(SELECT id FROM assignment WHERE mission_id IN(SELECT id FROM expired))) documents`,[days]);
 console.log(JSON.stringify({date:new Date().toISOString(),dryRun:true,proposedDays:days,policyActivated:false,counts}));await db.query('ROLLBACK');
 }finally{await db.end();}
});}catch{console.error('Retention preview failed; no values or personal data exported.');process.exitCode=1;}
