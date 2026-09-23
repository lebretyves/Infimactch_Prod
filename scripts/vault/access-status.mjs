import {readJson} from './common.mjs';
// Read local credential metadata only. No Vault request or credential mutation.
try {
  const roles=[];
  for(const role of ['backend','infra','operator']) {
    const value=await readJson(role+'.json');
    const expires=Date.parse(value.createdAt)+Number(value.ttlSeconds)*1000;
    if(!Number.isFinite(expires)||!(value.ttlSeconds>0))throw Error('INVALID_CREDENTIAL_EXPIRY');
    const remainingHours=Math.floor((expires-Date.now())/3600000);
    roles.push({role,expiresAt:new Date(expires).toISOString(),remainingHours,status:remainingHours<=0?'EXPIRED':remainingHours<=48?'RENEW_MANUALLY':'VALID'});
  }
  console.log(JSON.stringify({checkedAt:new Date().toISOString(),mode:'READ_ONLY',roles},null,2));
  if(roles.some(r=>r.status!=='VALID'))process.exitCode=2;
} catch {console.error('Credential metadata unavailable or invalid; no secret printed.');process.exitCode=1;}
