import {test} from 'node:test';
import assert from 'node:assert/strict';
let serial=0;
async function setup(saved){const values=new Map(saved?[['infimatch:inscription-draft-v1',saved]]:[]);globalThis.sessionStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};const module=await import('../src/pages/inscription/state.ts?case='+serial++);return {module,values};}
test('legacy, corrupt and future-dated drafts are removed',async()=>{
 for(const value of ['null','[]','"personal data"','{bad',JSON.stringify({email:'old@example.invalid'}),JSON.stringify({version:2,createdAt:Date.now()+10000,expiresAt:Date.now()+20000,data:{email:'future@example.invalid'}})]){const {module:m,values}=await setup(value);assert.equal(m.charger().email,'');assert.equal(values.size,0);}
});
test('fresh draft survives reload but passwords and bank data never reach storage',async()=>{
 const {module:m,values}=await setup();m.enregistrer({email:'draft@example.invalid',nom:'Exemple',motDePasse:'NotStored!123',iban:'FR00',bic:'SECRET',titulaireCompte:'Holder'});const saved=values.get(m.CLE_BROUILLON),obj=JSON.parse(saved);assert.equal(obj.version,2);assert.ok(obj.expiresAt<=obj.createdAt+m.DRAFT_IDLE_MS);for(const key of ['motDePasse','iban','bic','titulaireCompte'])assert.equal(key in obj.data,false);const next=await setup(saved);assert.equal(next.module.charger().email,'draft@example.invalid');assert.equal(next.module.charger().motDePasse,'');next.module.effacerBrouillon();assert.equal(next.values.size,0);
});
test('idle expiry clears memory and storage and stale write cannot resurrect data',async()=>{
 const original=Date.now;let now=1800000000000;Date.now=()=>now;
 try{const {module:m,values}=await setup();m.enregistrer({email:'draft@example.invalid',motDePasse:'MemoryOnly'});now+=m.DRAFT_IDLE_MS; m.enregistrer({nom:'Stale form'});assert.equal(m.charger().email,'');assert.equal(m.charger().motDePasse,'');assert.equal(m.charger().nom,'');assert.equal(values.size,0);}finally{Date.now=original;}
});
test('activity cannot extend the two-hour maximum',async()=>{
 const original=Date.now;let now=1800000000000;Date.now=()=>now;
 try{const {module:m,values}=await setup();const start=now;m.enregistrer({email:'draft@example.invalid'});for(let n=1;n<=7;n++){now=start+n*15*60000;m.enregistrer({nom:'Active'});}assert.equal(JSON.parse(values.get(m.CLE_BROUILLON)).expiresAt,start+m.DRAFT_MAX_MS);now=start+m.DRAFT_MAX_MS;assert.equal(m.verifierExpiration(),true);assert.equal(values.size,0);}finally{Date.now=original;}
});
test('storage denial does not prevent memory-only draft or its expiry',async()=>{
 const {module:m}=await setup();globalThis.sessionStorage={getItem(){throw Error('Denied')},setItem(){throw Error('Denied')},removeItem(){throw Error('Denied')}};m.enregistrer({email:'memory@example.invalid'});assert.equal(m.charger().email,'memory@example.invalid');m.effacerBrouillon();assert.equal(m.charger().email,'');
});
