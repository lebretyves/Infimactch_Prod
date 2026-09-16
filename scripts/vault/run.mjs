import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {root,withRole,request,readJson,validateSecrets,cleanEnvironment,selectKeys,configKeys} from './common.mjs';
const target=process.argv[2],args=process.argv.slice(3);
const commands={api:['backend/dist/main.js'],worker:['backend/dist/worker.js'],cli:['backend/dist/cli.js'],check:['scripts/vault/check-runtime.cjs']};
try {
  if(!(target in commands)&&target!=='infra')throw new Error('Use api, worker, cli, check or infra');
  if(['api','worker','check'].includes(target)&&args.length)throw new Error('Unexpected arguments');
  if(target==='infra'&&(args.length||!process.argv.includes('infra')))throw new Error('Infra command only starts the existing compose services');
  const group=target==='infra'?'infra':'backend';
  const config=await readJson('runtime.json');
  if(Object.keys(config).some(k=>!configKeys.includes(k)))throw new Error('Unexpected runtime configuration field');
  const values=await withRole(group,async token=>validateSecrets((await request('kv/data/infimatch/v1/'+group,{token})).data.data,group));
  const env={...cleanEnvironment(process.env),...config,...values,INFIMATCH_SECRET_SOURCE:'vault'};
  // Explicit port override is useful for an isolated read-only health check.
  if(process.env.PORT)env.PORT=process.env.PORT;
  let executable=process.execPath,childArgs;
  if(target==='infra'){
    executable='docker';
    // Avoid Docker Compose implicitly reading the legacy .env file.
    childArgs=['compose','--env-file',resolve(root,'.env.vault.example'),'-f',resolve(root,'infra/compose.yaml'),'--profile','automation','up','-d'];
  }else childArgs=['--use-system-ca',resolve(root,commands[target][0]),...args];
  const child=spawn(executable,childArgs,{cwd:root,env,stdio:'inherit',shell:false});
  child.on('error',()=>{console.error('Vault launcher: child could not start');process.exitCode=1;});
  child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
} catch(e) {console.error('Vault launcher refused startup: '+e.message);process.exitCode=1;}
