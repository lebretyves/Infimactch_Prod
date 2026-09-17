import {withRole,request} from './common.mjs';
import {Pool} from 'pg';import {randomBytes} from 'node:crypto';
try{await withRole('operator',async token=>{
 const path='kv/data/infimatch/v1/production',current=(await request(path,{token})).data;
 const local=(await request('kv/data/infimatch/v1/backend',{token})).data.data;
 const values={...current.data};values.DATABASE_APP_PASSWORD??=randomBytes(32).toString('hex');
 if(!/^[a-f0-9]{64}$/.test(values.DATABASE_APP_PASSWORD))throw Error('Unexpected password format');
 // Persist first so a retry never generates different credentials for an existing role.
 await request(path,{method:'POST',token,data:{options:{cas:current.metadata.version},data:values}});
 const admin=new Pool({connectionString:values.DATABASE_URL_UNPOOLED});
 try{const role=await admin.query("SELECT 1 FROM pg_roles WHERE rolname='infimatch_app'");if(!role.rowCount)await admin.query("CREATE ROLE infimatch_app LOGIN PASSWORD '"+values.DATABASE_APP_PASSWORD+"' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION");
 await admin.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO infimatch_app; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO infimatch_app; REVOKE ALL ON TABLE migrations FROM infimatch_app; REVOKE INSERT,UPDATE,DELETE ON spatial_ref_sys FROM infimatch_app; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO infimatch_app; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO infimatch_app; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO infimatch_app;");
 }finally{await admin.end();}
 const url=new URL(values.DATABASE_URL);url.username='infimatch_app';url.password=values.DATABASE_APP_PASSWORD;url.searchParams.set('sslmode','verify-full');values.DATABASE_URL=url.toString();
 const check=new Pool({connectionString:values.DATABASE_URL});try{await check.query('SELECT count(*) FROM account');const privileges=await check.query("SELECT has_schema_privilege(current_user,'public','CREATE') AS can_create,has_table_privilege(current_user,'migrations','SELECT') AS can_read_migrations");if(privileges.rows[0].can_create||privileges.rows[0].can_read_migrations)throw Error('Excessive application permissions');}finally{await check.end();}
 for(const key of ['DOCUMENT_KEY','GOOGLE_CLIENT_ID','FT_CLIENT_ID','FT_CLIENT_SECRET','RPPS_API_KEY','JOBSPIPE_API_KEY','DISCORD_RELAY_URL','DISCORD_RELAY_TOKEN'])if(local[key])values[key]=local[key];
 values.SESSION_SECRET??=randomBytes(32).toString('hex');values.SERVICE_TOKEN??=randomBytes(32).toString('hex');
 Object.assign(values,{NODE_ENV:'production',NODE_OPTIONS:'--experimental-require-module',APP_ORIGIN:'https://infimactch-prod-backend-l5bc.vercel.app',NOTIFICATION_APP_ORIGIN:'https://infimactch-prod-backend-l5bc.vercel.app',TRUST_PROXY:'1',DOCUMENT_STORAGE:'postgres',N8N_WEBHOOK_BASE:'https://infimatch.app.n8n.cloud/webhook/infimatch-prod',INFIMATCH_SECRET_SOURCE:'vercel'});
 const latest=(await request(path,{token})).data;await request(path,{method:'POST',token,data:{options:{cas:latest.metadata.version},data:values}});console.log('Production configuration prepared in Vault; PostgreSQL application role verified without schema or migration access.');
});}catch(e){console.error(JSON.stringify({status:'failed',code:e.code||e.name}));process.exitCode=1;}
