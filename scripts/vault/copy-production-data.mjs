// One-time, atomic copy into an EMPTY Neon database. Never alters local data.
import {withRole,request} from './common.mjs';
import {Client} from 'pg';
const excluded=new Set(['migrations','spatial_ref_sys','session','idempotency','discord_oauth_state','discord_challenge']);
const quote=x=>{if(!/^[a-z_][a-z0-9_]*$/.test(x))throw Error('Unsafe identifier');return '"'+x+'"';};
try{await withRole('operator',async token=>{
 const local=(await request('kv/data/infimatch/v1/backend',{token})).data.data;
 const production=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 const sourceUrl=new URL(local.DATABASE_URL),targetUrl=new URL(production.DATABASE_URL_UNPOOLED);
 if(!['127.0.0.1','localhost'].includes(sourceUrl.hostname)||!targetUrl.hostname.endsWith('.neon.tech'))throw Error('Unexpected copy target');
 targetUrl.searchParams.set('sslmode','verify-full');
 const source=new Client({connectionString:sourceUrl.toString()}),target=new Client({connectionString:targetUrl.toString()});
 await source.connect();await target.connect();
 try{
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const tables=(await source.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(x=>x.tablename).filter(x=>!excluded.has(x));
  if(Number((await source.query('SELECT count(*) AS n FROM document')).rows[0].n))throw Error('Documents require a separate encrypted-file migration');
  const edges=(await source.query("SELECT conrelid::regclass::text AS child,confrelid::regclass::text AS parent FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace")).rows;
  const ordered=[],pending=new Set(tables);
  while(pending.size){const ready=[...pending].filter(x=>!edges.some(e=>e.child===x&&e.parent!==x&&pending.has(e.parent)));if(!ready.length)throw Error('Cyclic dependencies');for(const t of ready){ordered.push(t);pending.delete(t);}}
  await target.query('BEGIN');
  await target.query('SELECT pg_advisory_xact_lock(1789381500)');
  for(const t of ordered){const n=Number((await target.query('SELECT count(*) AS n FROM '+quote(t))).rows[0].n);if(n)throw Error('Target is not empty: '+t);}
  for(const t of ordered){
   const cols=(await source.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND is_generated='NEVER' ORDER BY ordinal_position",[t])).rows.map(x=>quote(x.column_name)).join(',');
   await source.query('DECLARE transfer_cursor NO SCROLL CURSOR FOR SELECT '+cols+' FROM '+quote(t));
   let count=0;
   for(;;){const batch=(await source.query('FETCH FORWARD 500 FROM transfer_cursor')).rows;if(!batch.length)break;
    await target.query('INSERT INTO '+quote(t)+' ('+cols+') OVERRIDING SYSTEM VALUE SELECT '+cols+' FROM json_populate_recordset(NULL::'+quote(t)+',$1::json)',[JSON.stringify(batch)]);count+=batch.length;
   }
   await source.query('CLOSE transfer_cursor');
   const actual=Number((await target.query('SELECT count(*) AS n FROM '+quote(t))).rows[0].n);if(actual!==count)throw Error('Count mismatch');
   console.log(JSON.stringify({table:t,copied:count}));
  }
  const sequences=(await target.query("SELECT table_name,column_name,pg_get_serial_sequence(quote_ident(table_schema)||'.'||quote_ident(table_name),column_name) AS sequence FROM information_schema.columns WHERE table_schema='public' AND (is_identity='YES' OR column_default LIKE 'nextval(%')")).rows;
  for(const s of sequences){if(excluded.has(s.table_name)||!s.sequence)continue;await target.query('SELECT setval($1::regclass,COALESCE(max('+quote(s.column_name)+'),1),max('+quote(s.column_name)+') IS NOT NULL) FROM '+quote(s.table_name),[s.sequence]);}
  await target.query('COMMIT');await source.query('COMMIT');console.log('Atomic production copy PASS; local data retained; sessions and transient credentials excluded.');
 }catch(e){await target.query('ROLLBACK').catch(()=>{});await source.query('ROLLBACK').catch(()=>{});throw e;}finally{await target.end();await source.end();}
});}catch(e){console.error(JSON.stringify({status:'failed',code:e.code||e.name}));process.exitCode=1;}



