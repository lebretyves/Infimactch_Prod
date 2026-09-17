import {withRole,request} from './common.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
try { await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 const url=new URL(values.DATABASE_URL_UNPOOLED);
 if(!url.hostname.endsWith('.neon.tech'))throw Error('Unexpected migration target');
 url.searchParams.set('sslmode','verify-full');
 process.env.DATABASE_URL=url.toString();process.env.INFIMATCH_SECRET_SOURCE='vault';
 const {Database}=require('../../backend/dist/database/database.js');
 const db=await new Database().connect();
 try{const applied=await db.source.runMigrations({transaction:'all'});console.log(JSON.stringify({applied:applied.map(x=>x.name)}));}finally{await db.onModuleDestroy();}
 });}catch(e){console.error(JSON.stringify({status:'failed',code:e.code||e.name}));process.exitCode=1;}
