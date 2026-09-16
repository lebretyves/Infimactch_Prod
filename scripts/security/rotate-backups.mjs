import {readdir,readFile,realpath,rm,stat} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),base=join(root,'backups'),apply=process.argv.includes('--apply');
const cutoff=Date.now()-30*86400000;const candidates=[];
for(const e of await readdir(base,{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];throw e;})){
 if(!e.isDirectory()||e.isSymbolicLink()||!/^full-v1-\d{4}-/.test(e.name))continue;
 const path=join(base,e.name),resolved=await realpath(path),safeBase=await realpath(base);
 if(!resolved.startsWith(safeBase+sep))throw Error('Backup path leaves backup directory');
 try{const m=JSON.parse(await readFile(join(path,'manifest.json'),'utf8'));const date=Date.parse(m.date);if(m.quiesced!==true||!Array.isArray(m.files)||!Number.isFinite(date))continue;
 if(await stat(join(path,'INCOMPLETE.txt')).then(()=>true,()=>false))continue;
 candidates.push({path,date});}catch{}
}
candidates.sort((a,b)=>b.date-a.date);
const expired=candidates.slice(2).filter(x=>x.date<cutoff);
for(const backup of expired)if(apply){const baseReal=await realpath(base),target=await realpath(backup.path);if(!target.startsWith(baseReal+sep))throw Error('Unsafe deletion target');await rm(target,{recursive:true});}
console.log(JSON.stringify({dryRun:!apply,retentionDays:30,minimumKept:2,eligible:expired.length,deleted:apply?expired.length:0}));
