import type {Store} from 'express-session';
import type {Pool} from 'pg';

/** A delayed request must never recreate a session destroyed by logout.
 * Keep a non-authenticated tombstone for the maximum session lifetime.
 * The normal expired-session cleanup removes these records afterwards.
 */
export function protectSessionRevocation<T extends Store>(store:T,pool:Pool,table:'session'|'admin_session'):T {
 const get=store.get.bind(store);
 store.get=(sid,done)=>get(sid,(error,value)=>done(error,(value as any)?.revoked?null:value));
 store.set=(sid,value,done)=>{
  const expiration=value.cookie?.expires?new Date(value.cookie.expires):new Date(Date.now()+8*3600000);
  pool.query(`INSERT INTO ${table}(sid,sess,expire) VALUES($1,$2,$3)
    ON CONFLICT(sid) DO UPDATE SET sess=EXCLUDED.sess,expire=EXCLUDED.expire
    WHERE ${table}.sess->>'revoked' IS DISTINCT FROM 'true'`,[sid,JSON.stringify(value),expiration])
   .then(()=>done?.(),error=>(done as ((error?:Error)=>void)|undefined)?.(error));
 };
 store.destroy=(sid,done)=>{
  pool.query(`INSERT INTO ${table}(sid,sess,expire) VALUES($1,'{"revoked":true}',now()+interval '8 hours')
    ON CONFLICT(sid) DO UPDATE SET sess=EXCLUDED.sess,expire=GREATEST(${table}.expire,EXCLUDED.expire)`,[sid])
   .then(()=>done?.(),error=>(done as ((error?:Error)=>void)|undefined)?.(error));
 };
 store.touch=(sid,value,done)=>{
  const expiration=value.cookie?.expires?new Date(value.cookie.expires):new Date(Date.now()+8*3600000);
  pool.query(`UPDATE ${table} SET expire=$2 WHERE sid=$1 AND sess->>'revoked' IS DISTINCT FROM 'true'`,[sid,expiration])
   .then(()=>done?.(),error=>(done as ((error?:Error)=>void)|undefined)?.(error));
 };
 return store;
}
