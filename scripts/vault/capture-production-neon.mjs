import {withRole,request} from './common.mjs';
try {
 const selected=Object.fromEntries(['DATABASE_URL','DATABASE_URL_UNPOOLED','NEON_PROJECT_ID'].map(k=>[k,process.env[k]]));
 for(const key of ['DATABASE_URL','DATABASE_URL_UNPOOLED']){let url;try{url=new URL(selected[key]);}catch{throw Error('Invalid Neon configuration');}if(!url.hostname.endsWith('.neon.tech')||!url.password)throw Error('Expected authenticated Neon URL');}
 await withRole('operator',async token=>{const path='kv/data/infimatch/v1/production';let previous;try{previous=(await request(path,{token})).data;}catch(e){if(e.status!==404)throw e;}
 await request(path,{method:'POST',token,data:{options:{cas:previous?.metadata.version??0},data:{...previous?.data,...selected}}});});
 console.log('Neon production credentials stored in Vault.');
}catch{console.error('Neon capture failed; no credential values displayed.');process.exitCode=1;}
