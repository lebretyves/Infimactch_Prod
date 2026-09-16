import {withRole,request} from './common.mjs';
import {Client} from 'pg';
const quote=x=>{if(!/^[a-z_][a-z0-9_]*$/.test(x))throw Error('Unsafe identifier');return '"'+x+'"';};
try{await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 const url=new URL(values.DATABASE_URL_UNPOOLED);if(!url.hostname.endsWith('.neon.tech'))throw Error('Unexpected target');url.searchParams.set('sslmode','verify-full');
 const db=new Client({connectionString:url.toString()});await db.connect();
 try{await db.query('BEGIN');const rows=(await db.query("SELECT table_name,column_name,pg_get_serial_sequence(quote_ident(table_schema)||'.'||quote_ident(table_name),column_name) AS sequence FROM information_schema.columns WHERE table_schema='public' AND (is_identity='YES' OR column_default LIKE 'nextval(%')")).rows;
 for(const r of rows){if(!r.sequence)continue;await db.query('LOCK TABLE '+quote(r.table_name)+' IN SHARE ROW EXCLUSIVE MODE');const [{maximum}]=(await db.query('SELECT COALESCE(max('+quote(r.column_name)+'),0)::text AS maximum FROM '+quote(r.table_name))).rows;const name=r.sequence.split('.').map(quote).join('.');const [state]=(await db.query('SELECT last_value::text,is_called FROM '+name)).rows;const next=BigInt(maximum)+1n;const current=BigInt(state.last_value)+(state.is_called?1n:0n);if(next>current)await db.query('SELECT setval($1::regclass,$2::bigint,false)',[r.sequence,String(next)]);console.log(JSON.stringify({table:r.table_name,previousNext:String(current),maximum,next:String(next>current?next:current),repaired:next>current}));}
 await db.query('COMMIT');}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}
});}catch(e){console.error(JSON.stringify({status:'failed',code:e.code||e.name}));process.exitCode=1;}
