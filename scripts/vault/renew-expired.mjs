import {request,readJson,saveJson,withRole,revoke,validateSecrets} from './common.mjs';
// Renew only expired application access; never modify application secrets or policies.
const result=[];
await withRole('operator',async token=>{
  for(const group of ['backend','infra']){
    const previous=await readJson(group+'.json');
    const expires=Date.parse(previous.createdAt)+previous.ttlSeconds*1000;
    if(!Number.isFinite(expires)||!(previous.ttlSeconds>0))throw Error('INVALID_CREDENTIAL_EXPIRY');
    if(expires>Date.now()){result.push({role:group,status:'NOT_EXPIRED'});continue;}
    const path='auth/approle/role/infimatch-v1-'+group;
    const role=await request(path+'/role-id',{token});
    const issued=await request(path+'/secret-id',{method:'POST',data:{},token});
    const credentials={role_id:role.data.role_id,secret_id:issued.data.secret_id,secret_id_accessor:issued.data.secret_id_accessor,createdAt:new Date().toISOString(),ttlSeconds:issued.data.secret_id_ttl};
    let saved=false;
    try{
      const login=await request('auth/approle/login',{method:'POST',data:{role_id:credentials.role_id,secret_id:credentials.secret_id}});
      const temporary=login.auth.client_token;
      try{
        const own=await request('kv/data/infimatch/v1/'+group,{token:temporary});validateSecrets(own.data.data,group);
        const other=group==='backend'?'infra':'backend';let forbidden=false;
        try{await request('kv/data/infimatch/v1/'+other,{token:temporary});}catch(e){if(e.status!==403)throw e;forbidden=true;}
        if(!forbidden)throw Error('ROLE_ISOLATION_FAILED');
      }finally{await revoke(temporary);}
      await saveJson(group+'.json',credentials);saved=true;
      result.push({role:group,status:'RENEWED',previousExpiredAt:new Date(expires).toISOString(),expiresAt:new Date(Date.parse(credentials.createdAt)+credentials.ttlSeconds*1000).toISOString(),isolationVerified:true});
    }finally{
      if(!saved)await request(path+'/secret-id-accessor/destroy',{method:'POST',token,data:{secret_id_accessor:credentials.secret_id_accessor}});
    }
  }
});
console.log(JSON.stringify({status:'PASS',roles:result,applicationSecretsChanged:false}));
