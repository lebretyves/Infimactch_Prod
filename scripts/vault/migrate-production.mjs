import { managedPostgresUrl, managedPostgresConnection } from './postgres-target.mjs';
import {withRole,request} from './common.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
try { await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 const url=managedPostgresUrl(values.DATABASE_URL_MIGRATION || values.DATABASE_URL_UNPOOLED);
 managedPostgresConnection(url.toString(),values.DATABASE_CA_CERT);
 if(values.DATABASE_CA_CERT)process.env.DATABASE_CA_CERT=values.DATABASE_CA_CERT;else delete process.env.DATABASE_CA_CERT;
 url.searchParams.set('sslmode','verify-full');
 process.env.DATABASE_URL=url.toString();process.env.INFIMATCH_SECRET_SOURCE='vault';
 const {Database}=require('../../backend/dist/database/database.js');
 const db=await new Database().connect();
 try{const applied=await db.source.runMigrations({transaction:'all'});console.log(JSON.stringify({applied:applied.map(x=>x.name)}));}finally{await db.onModuleDestroy();}
 });}catch(e){console.error(JSON.stringify({status:'failed',code:e.code||e.name}));process.exitCode=1;}
