import {randomBytes} from 'node:crypto';import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),file=resolve(root,'.env');const token=()=>randomBytes(32).toString('hex');
const postgres=token(),mongo=token();
const values={DATABASE_URL:'postgresql://infimatch:'+postgres+'@127.0.0.1:55432/infimatch',MONGODB_URI:'mongodb://infimatch:'+mongo+'@127.0.0.1:57017/infimatch?authSource=admin',POSTGRES_PASSWORD:postgres,MONGO_PASSWORD:mongo,SESSION_SECRET:token(),DOCUMENT_KEY:randomBytes(32).toString('base64'),SERVICE_TOKEN:token(),N8N_ENCRYPTION_KEY:token()};
const text=(await readFile(resolve(root,'.env.example'),'utf8')).split(/\r?\n/).map(line=>{const key=line.split('=')[0];return key in values?key+'='+values[key]:line;}).join('\n');
try{await writeFile(file,text,{flag:'wx',mode:0o600});console.log('Local .env created. Values are not printed.');}catch(e){if(e.code==='EEXIST')console.log('.env already exists; preserved.');else throw e;}
