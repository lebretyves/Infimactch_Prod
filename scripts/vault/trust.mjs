import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {privateDir} from './common.mjs';
if(process.platform!=='win32'){console.error('This helper only installs the CA in the current Windows user trust store.');process.exitCode=1;}
else{
 const p=spawnSync('powershell',['-NoProfile','-Command',"$ErrorActionPreference='Stop'; Import-Certificate -FilePath $env:INFIMATCH_LOCAL_CA_PATH -CertStoreLocation Cert:\\CurrentUser\\Root | Out-Null"],{env:{...process.env,INFIMATCH_LOCAL_CA_PATH:resolve(privateDir,'tls/ca.crt')},stdio:'inherit',shell:false});
 if(p.status!==0)process.exitCode=1;else console.log('Local Vault CA added to the current Windows user trust store.');
}
