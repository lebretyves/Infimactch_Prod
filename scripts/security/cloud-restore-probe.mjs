import {spawnSync} from 'node:child_process';
import {randomBytes,randomUUID,createCipheriv,createDecipheriv,hkdfSync} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {decrypt,encrypt}=require('../../backend/dist/documents/crypto.js');
import {RESTORE_POSTGRES_IMAGE as PG} from './restore-images.mjs';
const MONGO='mongo:8.0.5@sha256:7bd28e5eea1c5766a084d5818254046f3ebe3b8f20a65e3a274640189e296667';
const MAX=512*1024*1024;
function docker(args,input){const r=spawnSync('docker',args,{input,maxBuffer:MAX,timeout:120000,windowsHide:true});if(r.status!==0)throw Error('ISOLATED_DOCKER_OPERATION_FAILED');return r.stdout;}
async function ready(args){for(let n=0;n<40;n++){try{docker(args);return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('ISOLATED_CONTAINER_NOT_READY');}

export function sealBackup(bytes,key){const salt=randomBytes(32),iv=randomBytes(12),derived=hkdfSync('sha256',key,salt,'infimatch-production-backup-v1',32),cipher=createCipheriv('aes-256-gcm',derived,iv);return {bytes:Buffer.concat([cipher.update(bytes),cipher.final()]),salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64')};}
export function openBackup(bytes,key,entry){if(bytes.length>MAX)throw Error('BACKUP_EXCEEDS_PROBE_LIMIT');const derived=hkdfSync('sha256',key,Buffer.from(entry.salt,'base64'),'infimatch-production-backup-v1',32),decipher=createDecipheriv('aes-256-gcm',derived,Buffer.from(entry.iv,'base64'));decipher.setAuthTag(Buffer.from(entry.tag,'base64'));return Buffer.concat([decipher.update(bytes),decipher.final()]);}

/** Isolated restore only: no published port, no host mount, no external network.
 * Input is already authenticated. SQL and Mongo output never reaches stdout.
 * Containers hold data in tmpfs and are removed in finally. Nothing is promoted.
 */
export async function restoreProbe({dump,mongo,configuration,synthetic=false}) {
  const started=Date.now(),prefix='infimatch-restore-probe-'+randomBytes(6).toString('hex'),containers=[];
  function runContainer(suffix,image,extra=[]){const name=prefix+'-'+suffix;docker(['run','-d','--name',name,'--label','infimatch.restore-probe='+prefix,'--network','none',...extra,image]);containers.push(name);return name;}
  function sql(pg,query){return docker(['exec','-i',pg,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','restore_admin','-d','infimatch_restore'],query).toString().trim();}
  try {
    const pg=runContainer('pg',PG,['--tmpfs','/var/lib/postgresql','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_USER=restore_admin','-e','POSTGRES_DB=infimatch_restore']);
    await ready(['exec',pg,'pg_isready','-h','127.0.0.1','-U','restore_admin','-d','infimatch_restore']);
    if(synthetic){
      const key=randomBytes(32),id=randomUUID(),content=Buffer.from('%PDF-1.4\nFICTITIOUS RESTORE PROBE\n%%EOF');configuration={DOCUMENT_KEY:key.toString('base64'),DOCUMENT_KEY_VERSION:'1'};
      const encrypted=encrypt(content,key,id);
      sql(pg,`CREATE TABLE account(id uuid); CREATE TABLE mission(id uuid); CREATE TABLE document(id uuid,size_bytes integer,key_version integer,status text,storage_backend text); CREATE TABLE document_blob(document_id uuid,encrypted bytea); INSERT INTO document VALUES('${id}',${content.length},1,'READY','postgres'); INSERT INTO document_blob VALUES('${id}',decode('${encrypted.toString('hex')}','hex'));`);
      dump=docker(['exec',pg,'pg_dump','-U','restore_admin','-d','infimatch_restore','-Fc','--no-owner','--no-acl','--schema=public']);
      // Exercise the same authenticated archive envelope as production backups.
      const envelope=sealBackup(dump,key);dump=openBackup(envelope.bytes,key,envelope);
      const damaged=Buffer.from(envelope.bytes);damaged[0]^=1;let rejected=false;try{openBackup(damaged,key,envelope);}catch{rejected=true;}if(!rejected)throw Error('AUTHENTICATION_TAMPER_NOT_REJECTED');
      sql(pg,'DROP TABLE document_blob,document,mission,account;');
      mongo={matchingruns:[{_id:{$oid:'000000000000000000000001'},result:{eligible:false,reasons:['FICTITIOUS']}}]};
    }
    if(!Buffer.isBuffer(dump)||!mongo||typeof mongo!=='object'||!configuration)throw Error('INVALID_RESTORE_INPUT');
    // A public-only managed dump references extension types, but omits extension
    // installation. The disposable PostGIS database already owns schema public.
    sql(pg,'CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS btree_gist; CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    const toc=docker(['exec','-i',pg,'pg_restore','--list'],dump).toString().split('\n').filter(line=>!/^\d+; .* SCHEMA - public /.test(line)).join('\n');
    docker(['exec','-i',pg,'sh','-c','umask 077; cat > /tmp/restore.list'],toc);
    docker(['exec','-i',pg,'pg_restore','-U','restore_admin','-d','infimatch_restore','--no-owner','--no-acl','--exit-on-error','--use-list=/tmp/restore.list'],dump);
    const counts=JSON.parse(sql(pg,"SELECT json_build_object('accounts',(SELECT count(*) FROM account),'missions',(SELECT count(*) FROM mission),'documents',(SELECT count(*) FROM document),'blobs',(SELECT count(*) FROM document_blob));"));
    const missing=Number(sql(pg,"SELECT count(*) FROM document d LEFT JOIN document_blob b ON b.document_id=d.id WHERE d.status='READY' AND (d.storage_backend<>'postgres' OR b.document_id IS NULL);"));
    if(missing)throw Error('RESTORED_DOCUMENT_STORAGE_INCOMPLETE');
    const docs=JSON.parse(sql(pg,"SELECT coalesce(json_agg(x),'[]') FROM (SELECT d.id,d.size_bytes,d.key_version,encode(b.encrypted,'base64') encrypted FROM document d JOIN document_blob b ON b.document_id=d.id WHERE d.status='READY') x;"));
    for(const d of docs){const key=d.key_version===Number(configuration.DOCUMENT_KEY_VERSION||1)?configuration.DOCUMENT_KEY:configuration['DOCUMENT_KEY_V'+d.key_version];if(!key)throw Error('RESTORE_KEY_VERSION_MISSING');const clear=decrypt(Buffer.from(d.encrypted,'base64'),Buffer.from(key,'base64'),d.id);if(clear.length!==d.size_bytes)throw Error('RESTORED_DOCUMENT_SIZE_MISMATCH');clear.fill(0);}
    const mg=runContainer('mongo',MONGO,['--tmpfs','/data/db']);await ready(['exec',mg,'mongosh','--quiet','--eval',"db.adminCommand('ping')"]);
    let mongoDocuments=0;
    for(const [collection,rows] of Object.entries(mongo)){
      if(!/^[A-Za-z_][A-Za-z0-9_-]{0,119}$/.test(collection)||!Array.isArray(rows))throw Error('INVALID_MONGO_BACKUP_COLLECTION');
      // No interpolation into executable source: both names and EJSON are quoted literals.
      const source=`const target=db.getSiblingDB('infimatch_restore').getCollection(${JSON.stringify(collection)});const rows=EJSON.parse(${JSON.stringify(JSON.stringify(rows))});if(rows.length)target.insertMany(rows);if(target.countDocuments({})!==rows.length)throw Error('RESTORE_COUNT_MISMATCH');`;
      docker(['exec','-i',mg,'mongosh','--quiet','--file','/dev/stdin'],source);mongoDocuments+=rows.length;
    }
    return {status:'PASS',synthetic,elapsedMs:Date.now()-started,sqlCounts:counts,mongoCollections:Object.keys(mongo).length,mongoDocuments,decryptedDocuments:docs.length,network:'none',portsPublished:false,productionModified:false,reopeningAllowed:false,limit:'This probe never promotes data or replays the current erasure ledger. Before any recovery, reconcile the CURRENT ledger separately.'};
  } finally {
    for(const name of containers.reverse()){
      if(!name.startsWith(prefix+'-'))throw Error('UNEXPECTED_CONTAINER_TARGET');
      const label=docker(['inspect','--format','{{ index .Config.Labels "infimatch.restore-probe" }}',name]).toString().trim();
      if(label!==prefix)throw Error('RESTORE_CONTAINER_LABEL_MISMATCH');
      docker(['rm','-f','-v',name]);
    }
  }
}
