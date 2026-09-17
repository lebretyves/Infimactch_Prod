import {Pool} from 'pg';import mongoose from 'mongoose';import {randomBytes} from 'node:crypto';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';import {spawnSync} from 'node:child_process';import {parse} from 'dotenv';
import {root,withRole,request} from '../vault/common.mjs';
const privateDir=resolve(root,'data/security');await mkdir(privateDir,{recursive:true});
if(process.platform==='win32'){const who=spawnSync('whoami',[],{encoding:'utf8'}).stdout.trim();if(spawnSync('icacls',[privateDir,'/inheritance:r','/grant:r',who+':(OI)(CI)F','SYSTEM:(OI)(CI)F']).status!==0)throw Error('ACL failed');}
const original=parse(await readFile(resolve(root,'.env'),'utf8'));
let keys;try{keys=JSON.parse(await readFile(resolve(privateDir,'database-roles.json'),'utf8'));}catch{keys={app:randomBytes(32).toString('hex'),migration:randomBytes(32).toString('hex'),mongo:randomBytes(32).toString('hex')};await writeFile(resolve(privateDir,'database-roles.json'),JSON.stringify(keys),{mode:0o600});}
const pgURL=new URL(original.DATABASE_URL);pgURL.username='infimatch';pgURL.password=original.POSTGRES_PASSWORD;
const pg=new Pool({connectionString:pgURL.toString()});
try{
 for(const [role,password] of [['infimatch_app',keys.app],['infimatch_migrator',keys.migration]]){
  if(!/^[a-f0-9]{64}$/.test(password))throw Error('Invalid generated credential');
  const found=await pg.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role]);
  if(!found.rowCount)await pg.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`);
 }
 await pg.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO infimatch_app; GRANT USAGE,CREATE ON SCHEMA public TO infimatch_migrator;
 DO $$ DECLARE r record; BEGIN FOR r IN SELECT c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN('r','S') AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.objid=c.oid AND d.deptype='e') ORDER BY c.relkind LOOP
 IF r.relkind='r' THEN EXECUTE format('ALTER TABLE public.%I OWNER TO infimatch_migrator',r.relname); END IF; END LOOP; END $$;
 GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO infimatch_app;
 REVOKE ALL ON TABLE migrations FROM infimatch_app;
 GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO infimatch_app;
 ALTER DEFAULT PRIVILEGES FOR ROLE infimatch_migrator IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO infimatch_app;
 ALTER DEFAULT PRIVILEGES FOR ROLE infimatch_migrator IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO infimatch_app;`);
 pgURL.username='infimatch_app';pgURL.password=keys.app;const appURL=pgURL.toString();pgURL.username='infimatch_migrator';pgURL.password=keys.migration;const migrationURL=pgURL.toString();
 const mongoURL=new URL(original.MONGODB_URI);const dbName=mongoURL.pathname.slice(1)||'infimatch';mongoURL.username='infimatch';mongoURL.password=original.MONGO_PASSWORD;mongoURL.searchParams.set('authSource','admin');
 const conn=await mongoose.createConnection(mongoURL.toString()).asPromise();
 try{const users=await conn.db.command({usersInfo:'infimatch_app'});if(!users.users.length)await conn.db.command({createUser:'infimatch_app',pwd:keys.mongo,roles:[{role:'readWrite',db:dbName}]});}finally{await conn.close();}
 mongoURL.username='infimatch_app';mongoURL.password=keys.mongo;mongoURL.searchParams.set('authSource',dbName);
 const check=new Pool({connectionString:appURL});try{await check.query('SELECT count(*) FROM account');let denied=false;try{await check.query('CREATE TABLE public.forbidden_security_test(id int)');}catch(e){denied=e.code==='42501';}if(!denied)throw Error('Application unexpectedly owns schema');}finally{await check.end();}
 const mc=await mongoose.createConnection(mongoURL.toString()).asPromise();try{await mc.db.collection('matchingruns').findOne({});let denied=false;try{await mc.db.admin().command({usersInfo:1});}catch(e){denied=e.code===13;}if(!denied)throw Error('Mongo application unexpectedly administers users');}finally{await mc.close();}
 await withRole('operator',async token=>{
  const current=await request('kv/data/infimatch/v1/backend',{token});const values={...current.data.data,DATABASE_URL:appURL,MONGODB_URI:mongoURL.toString()};
  await request('kv/data/infimatch/v1/backend',{method:'POST',token,data:{options:{cas:current.data.metadata.version},data:values}});
  let migration;try{migration=await request('kv/data/infimatch/v1/migration',{token});}catch(e){if(e.status!==404)throw e;}
  await request('kv/data/infimatch/v1/migration',{method:'POST',token,data:{options:{cas:migration?.data.metadata.version||0},data:{DATABASE_URL:migrationURL}}});
 });
 let text=await readFile(resolve(root,'.env'),'utf8');text=text.replace(/^DATABASE_URL=.*$/m,'DATABASE_URL='+appURL).replace(/^MONGODB_URI=.*$/m,'MONGODB_URI='+mongoURL.toString());await writeFile(resolve(root,'.env'),text,{mode:0o600});
 console.log('Restricted application roles verified; separate migration login; Vault and local fallback synchronized.');
}finally{await pg.end();}
