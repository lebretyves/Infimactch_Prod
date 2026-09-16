import {spawn} from 'node:child_process';
import {existsSync,createWriteStream} from 'node:fs';
import {resolve} from 'node:path';
import {root,withRole,request,readJson} from '../vault/common.mjs';
const values=await withRole('backend',async token=>(await request('kv/data/infimatch/v1/backend',{token})).data.data);
const runtime=await readJson('runtime.json');
const production=process.argv.includes('--production');
if(production&&!process.env.APP_DOMAIN)throw Error('APP_DOMAIN required for public HTTPS');
const env={...process.env,...runtime,...values,INFIMATCH_SECRET_SOURCE:'vault',NODE_ENV:'production',APP_ORIGIN:production?'https://'+process.env.APP_DOMAIN:'https://localhost:8443',TRUST_PROXY:'loopback',API_HOST:'127.0.0.1',PORT:'3101',
 INFIMATCH_FRONTEND_DIST:process.env.INFIMATCH_FRONTEND_DIST||resolve(root,existsSync(resolve(root,'frontend'))?'frontend/dist':'../infiMatch-front-end/dist'),
 INFIMATCH_TLS_CERT:resolve(root,'data/vault/tls/server.crt'),INFIMATCH_TLS_KEY:resolve(root,'data/vault/tls/server.key')};
const binary=process.env.CADDY_BINARY||(process.platform==='win32'?resolve(root,'../outils/caddy/caddy.exe'):'caddy');
const children=[];
for(const [exe,args,name] of [[process.execPath,['--use-system-ca','backend/dist/main.js'],'https-api'],[binary,['run','--config',resolve(root,'infra/https/Caddyfile.'+(production?'production':'local')),'--adapter','caddyfile'],'https-proxy']]){
 const child=spawn(exe,args,{cwd:root,env,stdio:['ignore','pipe','pipe'],windowsHide:true});children.push(child);const log=createWriteStream(resolve(root,'data/security/'+name+'.log'),{flags:'a'});child.stdout.pipe(log);child.stderr.pipe(log);child.on('error',()=>{console.error(name+' failed to start');for(const other of children)other.kill();process.exitCode=1;});child.on('exit',code=>{for(const other of children)if(other!==child)other.kill();process.exitCode=code||0;});
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const child of children)child.kill(signal);});
console.log('HTTPS available at '+env.APP_ORIGIN);
