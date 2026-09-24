import {createHash,randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export function validateLocalAdminConfig(env,email) {
  if(env.NODE_ENV!=='development')throw Error('Local bootstrap requires NODE_ENV=development');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email??''))throw Error('Provide the email of an existing local account');
  const db=new URL(env.DATABASE_URL);
  if(!['postgres:','postgresql:'].includes(db.protocol)||!['127.0.0.1','localhost','[::1]'].includes(db.hostname)||db.port!=='55432'||db.pathname!=='/infimatch'||db.search||db.hash)throw Error('Only the local Docker database on port 55432 is allowed');
  if(env.ADMIN_ORIGIN!=='http://127.0.0.1:5175')throw Error('Set ADMIN_ORIGIN=http://127.0.0.1:5175');
}

async function main() {
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const {parse}=await import('dotenv');
  // Use this clone's .env exclusively; never inherit a production database URL.
  const env=parse(await readFile(resolve(root,'.env'),'utf8'));
  const email=(process.argv[2]??'').trim().toLowerCase();
  validateLocalAdminConfig(env,email);
  const {default:pg}=await import('pg');const db=new pg.Client({connectionString:env.DATABASE_URL});
  const output=resolve(root,'data/admin/first-local-owner-invitation.json');let written=false,committed=false;
  await db.connect();
  try {
    await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(1789381700)');
    if((await db.query('SELECT 1 FROM platform_admin LIMIT 1')).rowCount)throw Error('An administrator already exists; use the admin invitation screen');
    const {rows:[account]}=await db.query('SELECT id FROM account WHERE lower(email)=$1 AND active',[email]);
    if(!account)throw Error('Register this account in the local application first');
    const invitation=randomBytes(32).toString('base64url');
    await db.query("INSERT INTO platform_admin(user_id,role,invitation_hash,invitation_expires_at) VALUES($1,'OWNER',$2,now()+interval '24 hours')",[account.id,createHash('sha256').update(invitation).digest('hex')]);
    await db.query("INSERT INTO audit(actor_id,event,resource_id) VALUES(NULL,'ADMIN_OWNER_BOOTSTRAPPED',$1)",[account.id]);
    await mkdir(dirname(output),{recursive:true});
    await writeFile(output,JSON.stringify({email,invitation,url:env.ADMIN_ORIGIN,expiresAt:new Date(Date.now()+86400000).toISOString()},null,2)+'\n',{flag:'wx',mode:0o600});written=true;
    await db.query('COMMIT');committed=true;
    console.log('Local OWNER invitation saved: '+output+' (valid 24 hours). No email sent.');
  } catch(error) {
    await db.query('ROLLBACK');if(written&&!committed)await unlink(output);
    throw error;
  } finally {await db.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
