import {readdir,lstat,realpath,unlink,rmdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {productionBackupBase,insideBackupBase} from './production-backup-paths.mjs';
const allowed=new Set(['postgres.dump.enc','mongo.ejson.enc','configuration.json.enc','manifest.json']);
const folderPattern=/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/;
export async function rotateProductionBackups({base,apply=false,now=Date.now()}={}) {
  base=base||await productionBackupBase();
  const canonical=await realpath(base);
  if((await lstat(base)).isSymbolicLink()||canonical.toLowerCase()!==resolve(base).toLowerCase())throw Error('BACKUP_DIRECTORY_REDIRECTION_REFUSED');
  base=canonical;
  const expired=[];
  for(const entry of await readdir(base,{withFileTypes:true})) {
    const match=entry.name.match(folderPattern);
    if(!match)continue;
    const created=Date.parse(`${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`);
    if(!Number.isFinite(created)||now-created<30*86400000)continue;
    const folder=resolve(base,entry.name);
    if(!insideBackupBase(base,folder)||entry.isSymbolicLink()||!entry.isDirectory())throw Error('BACKUP_ROTATION_UNSAFE_FOLDER');
    if((await realpath(folder)).toLowerCase()!==folder.toLowerCase())throw Error('BACKUP_ROTATION_REDIRECTED_FOLDER');
    const files=await readdir(folder,{withFileTypes:true});
    for(const file of files) {
      if(!allowed.has(file.name)||!file.isFile()||file.isSymbolicLink())throw Error('BACKUP_ROTATION_UNEXPECTED_CONTENT');
      const target=resolve(folder,file.name);
      if(!insideBackupBase(base,target)||(await realpath(target)).toLowerCase()!==target.toLowerCase())throw Error('BACKUP_ROTATION_UNSAFE_FILE');
    }
    expired.push(entry.name);
    if(apply){
      // Recheck immediately before deletion; never recurse or follow a link.
      if((await lstat(folder)).isSymbolicLink()||(await realpath(folder)).toLowerCase()!==folder.toLowerCase())throw Error('BACKUP_ROTATION_REDIRECTED_FOLDER');
      for(const file of files){const target=resolve(folder,file.name);if(!(await lstat(target)).isFile()||(await lstat(target)).isSymbolicLink())throw Error('BACKUP_ROTATION_UNSAFE_FILE');await unlink(target);}
      await rmdir(folder);
    }
  }
  return {status:'PASS',apply,retentionDays:30,expiredFolders:expired};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{console.log(JSON.stringify(await rotateProductionBackups({apply:process.argv.includes('--apply')})));}catch(error){console.error(JSON.stringify({status:'FAIL',code:/^[A-Z0-9_]+$/.test(error.message)?error.message:'BACKUP_ROTATION_FAILED'}));process.exitCode=1;}}
