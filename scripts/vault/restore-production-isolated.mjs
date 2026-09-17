import {readFile,realpath,stat,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {withRole,request,root} from './common.mjs';
import {openBackup,restoreProbe} from '../security/cloud-restore-probe.mjs';

try {
  let result;
  if(process.argv.includes('--self-test'))result=await restoreProbe({synthetic:true});
  else {
    const base=await realpath(resolve(root,'data/backups/production'));
    const folder=await realpath(resolve(process.argv[2]||base));
    if(!folder.startsWith(base+sep))throw Error('EXPECTED_PRODUCTION_BACKUP_SUBDIRECTORY');
    result=await withRole('operator',async token=>{
      const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
      const manifest=JSON.parse(await readFile(resolve(folder,'manifest.json'),'utf8'));
      if(manifest.version!==1||manifest.status!=='COMPLETE')throw Error('INCOMPLETE_BACKUP');
      const expected=['postgres.dump.enc','mongo.ejson.enc','configuration.json.enc'],opened={};
      if(!Array.isArray(manifest.files)||manifest.files.length!==3)throw Error('INVALID_BACKUP_MANIFEST');
      for(const name of expected){
        const entry=manifest.files.find(x=>x.file===name);if(!entry)throw Error('MISSING_BACKUP_COMPONENT');
        const file=await realpath(resolve(folder,name));if(!file.startsWith(folder+sep))throw Error('BACKUP_PATH_ESCAPE');
        if((await stat(file)).size>512*1024*1024)throw Error('BACKUP_EXCEEDS_PROBE_LIMIT');
        opened[name]=openBackup(await readFile(file),Buffer.from(values.DOCUMENT_KEY,'base64'),entry);
      }
      try{return await restoreProbe({dump:opened['postgres.dump.enc'],mongo:JSON.parse(opened['mongo.ejson.enc'].toString()),configuration:JSON.parse(opened['configuration.json.enc'].toString())});}
      finally{for(const bytes of Object.values(opened))bytes.fill(0);}
    });
  }
  const proof=resolve(root,'docs/quality');await mkdir(proof,{recursive:true});
  await writeFile(resolve(proof,result.synthetic?'restore-synthetic.json':'restore-production.json'),JSON.stringify({date:new Date().toISOString(),...result},null,2)+'\n');
  console.log(JSON.stringify(result));
} catch(error){console.error(JSON.stringify({status:'FAIL',code:/^[A-Z0-9_]+$/.test(error.message)?error.message:'RESTORE_PROBE_FAILED'}));process.exitCode=1;}
