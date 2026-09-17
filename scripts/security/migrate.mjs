import {spawnSync} from 'node:child_process';
import {root,withRole,request,readJson} from '../vault/common.mjs';
const values=await withRole('operator',async token=>(await request('kv/data/infimatch/v1/migration',{token})).data.data);
const runtime=await readJson('runtime.json');const result=spawnSync(process.execPath,['backend/dist/cli.js','migrate'],{cwd:root,env:{...process.env,...runtime,...values,INFIMATCH_SECRET_SOURCE:'vault'},stdio:'inherit'});process.exitCode=result.status??1;
