import {withRole,request} from './common.mjs';
import {managedPostgresUrl} from './postgres-target.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
try{await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 managedPostgresUrl(values.DATABASE_URL);
 process.env.DATABASE_URL=values.DATABASE_URL;process.env.INFIMATCH_SECRET_SOURCE='vault';
 if(values.DATABASE_CA_CERT)process.env.DATABASE_CA_CERT=values.DATABASE_CA_CERT;else delete process.env.DATABASE_CA_CERT;
 const {Database}=require('../../backend/dist/database/database.js');
 const {purgeDemoAlerts}=require('../../backend/dist/notifications/purge-demo-alerts.js');
 const db=await new Database().connect();
 try{const apply=process.argv.includes('--apply');for(let batch=1;batch<=(apply?20:1);batch++){const result=await purgeDemoAlerts(db,apply);console.log(JSON.stringify({batch,...result}));if(!result.hasMore||!apply||result.deletedAlerts+result.deletedLegacyDeliveries+result.completedEvents===0)break;}}
 finally{await db.onModuleDestroy();}
});}catch(e){console.error(JSON.stringify({status:'FAILED',code:e.code||e.name,quotaBlocked:e.code==='53000'}));process.exitCode=1;}
