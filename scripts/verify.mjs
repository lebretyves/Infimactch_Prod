import {spawnSync} from 'node:child_process';import {mkdirSync,writeFileSync} from 'node:fs';import {resolve,dirname} from 'node:path';
const root=resolve(import.meta.dirname,'..');mkdirSync(resolve(root,'docs/proofs'),{recursive:true});
const npmCli=process.env.npm_execpath??resolve(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const commands=[['typecheck'],['build'],['coverage']];const results=[];
for(const [name] of commands){const r=spawnSync(process.execPath,[npmCli,'run',name],{cwd:root,encoding:'utf8'});writeFileSync(resolve(root,'docs/proofs/'+name+'.txt'),((r.stdout??'')+(r.stderr??'')).split(/\r?\n/).map(line=>line.trimEnd()).join('\n').trimEnd()+'\n');results.push({command:'npm run '+name,exitCode:r.status});if(r.status!==0)break;}
writeFileSync(resolve(root,'docs/proofs/verification.json'),JSON.stringify({date:new Date().toISOString(),results},null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>r.exitCode!==0))process.exitCode=1;
