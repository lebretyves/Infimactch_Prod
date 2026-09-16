import {withRole,request} from './common.mjs';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const directory=resolve(process.argv[2]||'.');
await withRole('operator',async token=>{
 const secrets=[];
 for(const group of ['backend','production']){
  const values=(await request('kv/data/infimatch/v1/'+group,{token})).data.data;
  for(const [key,value] of Object.entries(values)){
   if(typeof value!=='string')continue;
   if(/SECRET|TOKEN|PASSWORD|DOCUMENT_KEY|API_KEY/.test(key)&&value.length>=12)secrets.push(value);
   if(/DATABASE_URL|MONGODB_URI/.test(key)){try{secrets.push(decodeURIComponent(new URL(value).password));}catch{}}
  }
 }
 const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:directory,encoding:'utf8'}).split('\0').filter(Boolean);
 const bad=files.filter(file=>{const data=readFileSync(resolve(directory,file));return secrets.filter(x=>x.length>=12).some(x=>data.includes(Buffer.from(x)));});
 if(bad.length){console.error(JSON.stringify({status:'FAIL',files:bad}));process.exitCode=1;}else console.log(JSON.stringify({status:'PASS',files:files.length}));
});
