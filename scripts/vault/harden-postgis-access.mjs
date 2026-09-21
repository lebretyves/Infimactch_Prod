import {withRole,request} from './common.mjs';
import {managedPostgresConnection} from './postgres-target.mjs';
import {createRequire} from 'node:module';
const {Client}=createRequire(import.meta.url)('pg');
const apply=process.argv.includes('--apply');
const rights=`SELECT r.rolname AS role,p.privilege,has_table_privilege(r.oid,'public.spatial_ref_sys',p.privilege) AS allowed FROM pg_roles r CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p(privilege) WHERE r.rolname IN ('anon','authenticated') ORDER BY role,privilege`;
try{
 const result=await withRole('operator',async token=>{
  const v=(await request('kv/data/infimatch/v1/production',{token})).data.data;
  let connectionUrl=v.DATABASE_URL_MIGRATION||v.DATABASE_URL_UNPOOLED;
  if(process.argv.includes('--owner')){
   const owner=(await request('kv/data/infimatch/v1/supabase-migration',{token})).data.data;
   const url=new URL(connectionUrl);
   if(!owner.PROJECT_REF||!owner.POSTGRES_PASSWORD||!(url.hostname==='db.'+owner.PROJECT_REF+'.supabase.co'||(url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username).endsWith('.'+owner.PROJECT_REF))))throw Error('OWNER_PROJECT_MISMATCH');
   url.username=url.hostname.endsWith('.pooler.supabase.com')?'postgres.'+owner.PROJECT_REF:'postgres';url.password=owner.POSTGRES_PASSWORD;connectionUrl=url.toString();
  }
  const client=new Client({...managedPostgresConnection(connectionUrl,v.DATABASE_CA_CERT),connectionTimeoutMillis:15000,statement_timeout:15000,application_name:'infimatch_postgis_acl_hardening'});
  await client.connect();
  try {
   await client.query(apply?'BEGIN':'BEGIN READ ONLY');
   const before=(await client.query(rights)).rows;
   if(before.length!==14)throw Error('EXPECTED_SUPABASE_ROLES_MISSING');
   const referenceBefore=(await client.query('SELECT count(*)::int AS rows FROM public.spatial_ref_sys')).rows[0].rows;
   if(apply){
    await client.query('SET LOCAL lock_timeout = \'5s\'');
    await client.query('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.spatial_ref_sys FROM anon, authenticated, PUBLIC');
   }
   const after=(await client.query(rights)).rows;
   if(apply&&after.some(r=>r.privilege!=='SELECT'&&r.allowed))throw Error('WRITE_PRIVILEGES_REMAIN');
   for(const row of before.filter(r=>r.privilege==='SELECT'))if(after.find(r=>r.role===row.role&&r.privilege==='SELECT')?.allowed!==row.allowed)throw Error('READ_PRIVILEGES_CHANGED');
   const geo=(await client.query('SELECT ST_SRID(ST_Transform(ST_SetSRID(ST_MakePoint(2.35,48.85),4326),2154)) AS srid, ST_Distance(ST_SetSRID(ST_MakePoint(2.35,48.85),4326)::geography,ST_SetSRID(ST_MakePoint(2.36,48.86),4326)::geography)>0 AS distance_ok')).rows[0];
   if(geo.srid!==2154||!geo.distance_ok)throw Error('POSTGIS_CHECK_FAILED');
   if((await client.query('SELECT count(*)::int AS rows FROM public.spatial_ref_sys')).rows[0].rows!==referenceBefore)throw Error('REFERENCE_ROWS_CHANGED');
   await client.query(apply?'COMMIT':'ROLLBACK');
   return {status:'PASS',mode:apply?'APPLIED':'READ_ONLY',date:new Date().toISOString(),before,after,referenceRows:referenceBefore,geography:geo};
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{await client.end();}
 });console.log(JSON.stringify(result,null,2));
}catch(error){console.error(JSON.stringify({status:'FAIL',code:error.code||(/^[A-Z_]+$/.test(error.message)?error.message:'POSTGIS_HARDENING_FAILED')}));process.exitCode=1;}
