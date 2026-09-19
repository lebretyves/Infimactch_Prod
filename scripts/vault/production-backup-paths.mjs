import {isAbsolute,resolve,sep} from 'node:path';
import {lstat,mkdir,realpath} from 'node:fs/promises';
import {root} from './common.mjs';
export async function productionBackupBase({create=false}={}) {
  const configured=process.env.INFIMATCH_BACKUP_DIRECTORY;
  if(configured&&!isAbsolute(configured))throw Error('BACKUP_DIRECTORY_MUST_BE_ABSOLUTE');
  const target=resolve(configured||resolve(root,'data/backups/production'));
  if(create)await mkdir(target,{recursive:true});
  if((await lstat(target)).isSymbolicLink())throw Error('BACKUP_DIRECTORY_LINK_REFUSED');
  const canonical=await realpath(target);
  if(canonical.toLowerCase()!==target.toLowerCase())throw Error('BACKUP_DIRECTORY_REDIRECTION_REFUSED');
  return canonical;
}
export function insideBackupBase(base,target){return target.toLowerCase().startsWith((base+sep).toLowerCase());}
