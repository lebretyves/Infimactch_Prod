import {spawnSync} from 'node:child_process';import fs from 'node:fs';
const run=(...args)=>{const r=spawnSync(process.execPath,['C:/Program Files/nodejs/node_modules/npm/bin/npx-cli.js','--offline','agent-browser','--session','parser-preview',...args],{encoding:'utf8',timeout:30000});if(r.status!==0)throw Error(r.stderr||r.stdout);console.log(r.stdout.trim());};
const corpus=JSON.parse(fs.readFileSync('data/parser-pilot/corpus.json'));const row=corpus.find(r=>r.id==='2ceed9ad-b0e6-49eb-b40f-fab2a81d58b4');
run('network','route','**/api/v1/**','--abort');
for(const [path,body] of [
 ['/auth/me',{id:'00000000-0000-4000-8000-000000000001',email:'demo@example.invalid',family:'NURSE',organizations:[]}],
 ['/profile',{display_name:'Aperçu',qualifications:['IDE'],details:{firstName:'Aperçu',lastName:'Test'}}],
 ['/me/favorites*',[]],
 ['/listings/e_'+row.id,{...row,id:'e_'+row.id,qualification:'IDE',active:true,kind:'EXTERNAL_OFFER'}]
])run('network','route','**/api/v1'+path,'--body',JSON.stringify(body));
run('set','viewport','1440','1000');
run('open','https://localhost:8443/missions/e_'+row.id);
run('snapshot','-i');
