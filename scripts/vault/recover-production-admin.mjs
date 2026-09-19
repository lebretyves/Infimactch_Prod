import {managedPostgresConnection} from './postgres-target.mjs';
// Exceptional operator procedure, never exposed by HTTP. Identity verification
// and explicit authorization of this exact account must precede --apply.
import {withRole,request} from './common.mjs';
import {Client} from 'pg';
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const email=process.argv[2],reason=process.argv[3],apply=process.argv.includes('--apply');
if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!reason||reason.length<20||reason.length>500)throw Error('Pass the authorized existing administrator email and an incident reference/reason of 20-500 characters; dry-run by default.');
await withRole('operator',async token=>{
  const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
  const db=new Client(managedPostgresConnection(values.DATABASE_URL_UNPOOLED,values.DATABASE_CA_CERT));await db.connect();
  try {
    await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(1789381700)');
    const {rows:[account]}=await db.query('SELECT a.id,p.role,p.active FROM account a JOIN platform_admin p ON p.user_id=a.id WHERE lower(a.email)=lower($1) AND a.active FOR UPDATE OF p',[email]);
    if(!account?.active)throw Error('Existing active administrator required; this procedure never grants or reactivates a role');
    if(!apply){await db.query('ROLLBACK');console.log(JSON.stringify({status:'DRY_RUN',effects:['revoke admin sessions','invalidate previous TOTP','require password and new authenticator enrollment'],roleUnchanged:true}));return;}
    const invitation=randomBytes(32).toString('base64url');
    await db.query("UPDATE platform_admin SET totp_secret=NULL,last_counter=-1,failed_attempts=0,locked_until=NULL,version=version+1,invitation_hash=$2,invitation_expires_at=now()+interval '1 hour' WHERE user_id=$1",[account.id,createHash('sha256').update(invitation).digest('hex')]);
    await db.query("DELETE FROM admin_session WHERE sess->>'adminId'=$1 OR sess->'adminChallenge'->>'userId'=$1",[account.id]);
    await db.query("INSERT INTO audit(event,resource_id,details) VALUES('ADMIN_MFA_RECOVERY_PREPARED',$1,$2)",[account.id,JSON.stringify({reason,operator:'vault-operator',roleUnchanged:true})]);
    const folder=resolve(import.meta.dirname,'../../data/admin');await mkdir(folder,{recursive:true});const file=resolve(folder,'recovery-'+randomUUID()+'.json');
    await writeFile(file,JSON.stringify({email,invitation,expiresAt:new Date(Date.now()+3600000).toISOString(),url:'https://infimatch-admin.vercel.app'},null,2),{flag:'wx',mode:0o600});
    await db.query('COMMIT');console.log(JSON.stringify({status:'REENROLLMENT_REQUIRED',file,roleUnchanged:true}));
  }catch{await db.query('ROLLBACK');console.error('Administrator recovery failed; no secret displayed.');process.exitCode=1;}finally{await db.end();}
});
