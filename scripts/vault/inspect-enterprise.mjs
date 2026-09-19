import {managedPostgresConnection} from './postgres-target.mjs';
import {withRole,request} from './common.mjs';
import {Client} from 'pg';
await withRole('operator',async token=>{const v=(await request('kv/data/infimatch/v1/production',{token})).data.data;const db=new Client(managedPostgresConnection(v.DATABASE_URL,v.DATABASE_CA_CERT));await db.connect();try{
 console.log(JSON.stringify({organizations:(await db.query('SELECT kind,count(*)::int FROM organization GROUP BY kind')).rows,missions:(await db.query('SELECT status,count(*)::int FROM mission GROUP BY status')).rows,needs:(await db.query("SELECT count(*)::int AS count,max(created_at) AS latest FROM staffing_request")).rows,links:(await db.query('SELECT count(*)::int FROM agency_link')).rows}));
}finally{await db.end();}});
