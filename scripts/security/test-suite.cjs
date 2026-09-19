// Runs integration files serially with genuinely isolated datasets, preserving assertions.
const {spawnSync}=require('node:child_process');
const {readdirSync,mkdirSync,writeFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {Client}=require('pg');
const mongoose=require('mongoose');
const root=resolve(__dirname,'../..'),backend=resolve(root,'backend');
const mode=process.argv[2]||'integration';
const proof=process.env.INFIMATCH_TEST_PROOF_DIR; if(proof)mkdirSync(proof,{recursive:true});
function guard(){
 const u=new URL(process.env.DATABASE_URL||'https://invalid');
 if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Requires isolated local PostgreSQL test database');
 const mongo=new URL(process.env.MONGODB_URI||'https://invalid');
 if(mongo.hostname!=='127.0.0.1'||mongo.port!=='57018'||mongo.pathname!=='/infimatch_test')throw Error('Requires isolated local MongoDB test database');
 for(const name of ['SMTP2GO_API_KEY','RESEND_API_KEY','RPPS_API_KEY','FT_CLIENT_SECRET','JOBSPIPE_API_KEY','DISCORD_BOT_TOKEN'])if(process.env[name])throw Error('Real provider configuration forbidden in isolated suite: '+name);
}
async function reset(){
 guard();const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();
 try{await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');}finally{await client.end();}
 const conn=mongoose.createConnection(process.env.MONGODB_URI);await conn.asPromise();try{await conn.dropDatabase();}finally{await conn.close();}
}
function run(args,label){
 const r=spawnSync(process.execPath,args,{cwd:backend,env:process.env,encoding:'utf8',maxBuffer:32*1024*1024,timeout:240000});
 const output=(r.stdout||'')+(r.stderr||'');if(proof)writeFileSync(resolve(proof,label+'.txt'),output);
 process.stdout.write(output);if(r.error)console.error(r.error.message);
 return r.status===0&&!r.error;
}
(async()=>{
 guard();const results=[];
 if(mode==='coverage')results.push({file:'unit',passed:run(['--test','--test-concurrency=1','.test-build/test/unit/*.spec.js'],'unit')});
 const selected=process.env.INFIMATCH_TEST_FILES?.split(',').filter(Boolean);
 const files=readdirSync(resolve(backend,'.test-build/test/integration')).filter(x=>x.endsWith('.spec.js')&&(!selected?.length||selected.includes(x))).sort();
 if(!files.length)throw Error('No selected integration test file');
 for(const file of files){
  console.log('ISOLATED FILE '+file);await reset();
  // This test intentionally creates legacy rows before applying the target upgrade.
  if(file!=='mission-guardrails.spec.js'&&!run(['dist/cli.js','migrate'],'migrate-'+file)){results.push({file,passed:false,stage:'migrate'});continue;}
  results.push({file,passed:run(['--test','--test-concurrency=1','.test-build/test/integration/'+file],file)});
 }
 if(proof)writeFileSync(resolve(proof,'suite-results.json'),JSON.stringify({date:new Date().toISOString(),mode,results},null,2));
 if(results.some(x=>!x.passed))process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
