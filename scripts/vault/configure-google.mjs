import {readJson,saveJson,configKeys} from './common.mjs';
const clientId=(process.argv[2]||'').trim();
if(!/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)){
 console.error('Usage: node scripts/vault/configure-google.mjs CLIENT_ID.apps.googleusercontent.com');
 process.exitCode=1;
}else{
 const runtime=await readJson('runtime.json');
 if(Object.keys(runtime).some(k=>!configKeys.includes(k)))throw new Error('Unexpected runtime configuration field');
 await saveJson('runtime.json',{...runtime,GOOGLE_CLIENT_ID:clientId});
 console.log('Identifiant public Google enregistré. Redémarrer l’API puis vérifier /api/v1/auth/google/config. Aucun secret OAuth requis.');
}
