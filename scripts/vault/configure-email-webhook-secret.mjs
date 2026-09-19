import {withRole,request} from './common.mjs';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const apply=process.argv.includes('--apply');
try{await withRole('operator',async token=>{
  const current=await request('kv/data/infimatch/v1/production',{token});
  const values=current.data.data;
  let secret=values.SMTP2GO_WEBHOOK_SECRET;
  if(secret&&!/^[A-Za-z0-9_-]{32,128}$/.test(secret))throw Error('INVALID_EXISTING_WEBHOOK_SECRET');
  if(!apply){console.log(JSON.stringify({status:'CHECKED',configured:!!secret}));return;}
  if(!secret){
    secret=randomBytes(32).toString('hex');
    await request('kv/data/infimatch/v1/production',{method:'POST',token,data:{options:{cas:current.data.metadata.version},data:{...values,SMTP2GO_WEBHOOK_SECRET:secret}}});
  }
  const cli=process.env.INFIMATCH_VERCEL_CLI||'C:/Users/lebre/AppData/Roaming/npm/node_modules/vercel/dist/vc.js';
  const run=spawnSync(process.execPath,['--use-system-ca',cli,'env','add','SMTP2GO_WEBHOOK_SECRET','production','--sensitive','--force','--yes','--scope','neotravel'],{cwd:'E:/Interimatch/.deployment-tools',input:secret,encoding:'utf8',windowsHide:true});
  if(run.status!==0)throw Error('WEBHOOK_VERCEL_CONFIGURATION_FAILED');
  console.log(JSON.stringify({status:'CONFIGURED',vault:true,vercel:true,valueDisplayed:false,redeployRequired:true}));
});}catch(error){console.error(JSON.stringify({status:'FAIL',code:/^[A-Z0-9_]+$/.test(error.message)?error.message:'WEBHOOK_CONFIGURATION_FAILED'}));process.exitCode=1;}
