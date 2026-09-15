import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {root,privateDir} from './common.mjs';
function run(binary,args,{quiet=false}={}) {
 const r=spawnSync(binary,args,{cwd:root,stdio:quiet?'ignore':'inherit',shell:false});
 if(r.status!==0)throw new Error('Setup command failed: '+binary);
}
try {
 mkdirSync(privateDir,{recursive:true,mode:0o700});
 if(process.platform==='win32'){
   const identity=execFileSync('whoami',[],{encoding:'utf8'}).trim();
   run('icacls',[privateDir,'/inheritance:r','/grant:r',identity+':(OI)(CI)F','*S-1-5-18:(OI)(CI)F'],{quiet:true});
 }
 const tls=join(privateDir,'tls');mkdirSync(tls,{recursive:true,mode:0o700});
 const openssl=process.platform==='win32'&&existsSync('C:/Program Files/Git/usr/bin/openssl.exe')?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl';
 if(!existsSync(join(tls,'server.crt'))){
   if(!existsSync(join(privateDir,'ca.key'))||!existsSync(join(tls,'ca.crt')))
     run(openssl,['req','-x509','-newkey','rsa:3072','-sha256','-nodes','-days','365','-keyout',join(privateDir,'ca.key'),'-out',join(tls,'ca.crt'),'-subj','/CN=InfiMatch Local Vault CA'],{quiet:true});
   run(openssl,['req','-new','-newkey','rsa:3072','-nodes','-keyout',join(tls,'server.key'),'-out',join(tls,'server.csr'),'-subj','/CN=localhost'],{quiet:true});
   writeFileSync(join(tls,'extensions.cnf'),'subjectAltName=DNS:localhost,DNS:vault,IP:127.0.0.1\n'+'basicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n');
   run(openssl,['x509','-req','-in',join(tls,'server.csr'),'-CA',join(tls,'ca.crt'),'-CAkey',join(privateDir,'ca.key'),'-CAcreateserial','-out',join(tls,'server.crt'),'-days','365','-sha256','-extfile',join(tls,'extensions.cnf')],{quiet:true});
 }
 run('docker',['compose','-f',join(root,'infra/vault/compose.yaml'),'up','-d']);
 run(process.execPath,[join(root,'scripts/vault/manage.mjs'),'bootstrap']);
}catch(e){console.error(e.message);process.exitCode=1;}
