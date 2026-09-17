import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4187';
assert.match(base,/localhost|127\.0\.0\.1/,'Preview-reader stub requires the local Vite server; actual file OCR stays real.');
const browser=await chromium.launch({channel:'msedge'});
try{
 const context=await browser.newContext();let writes=0;const external=[];
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==new URL(base).origin){external.push(url.origin);return route.abort();}
  if(url.pathname==='/src/lib/bankOcr.ts'&&!url.searchParams.has('fullFileRead'))return route.fulfill({contentType:'text/javascript',body:`export {analyzeBankFile} from '/src/lib/bankOcr.ts?fullFileRead=1'; export async function createBankCameraReader(){return {close(){},async read(){window.previewReads=(window.previewReads||0)+1;return 'IBAN: FR7630006000011234567890189';}};}`});
  if(!url.pathname.includes('/api/'))return route.continue();
  let json={};if(/\/me\/bank-(document|details)$/.test(url.pathname)&&!['GET','HEAD'].includes(route.request().method()))writes++;
  if(url.pathname.endsWith('/auth/me'))json={id:'fixture',family:'NURSE',email:'fixture@example.invalid',organizations:[]};
  else if(url.pathname.endsWith('/profile'))json={display_name:'Fixture',qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],details:{},rpps_status:'FOUND',accepted_shifts:[],preferred_shifts:[],visible:true};
  else if(url.pathname.endsWith('/me/bank-details'))json={iban:null,details:null,document:null,required:true};
  else if(url.pathname.endsWith('/reference-data'))json={ideServices:[],blockSpecialties:[]};
  else if(url.pathname.endsWith('/me/documents'))json=[];
  await route.fulfill({json});
 });
 const page=await context.newPage();await page.goto(base+'/dossier');const consent=page.getByRole('button',{name:'Tout refuser',exact:true});if(await consent.count())await consent.click();
 await page.getByRole('heading',{name:'Mon RIB',exact:true}).waitFor();
 await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=1700;c.height=660;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='38px monospace';
  ['RELEVE IDENTITE BANCAIRE','IBAN: FR76 3000 6000 0112 3456 7890 189','BIC: PSSTFRPPXXX','Titulaire du compte :','CAMILLE AUTO','Banque :','BANQUE EXEMPLE'].forEach((t,i)=>x.fillText(t,40,65+i*75));
  setInterval(()=>x.fillRect(0,0,1,1),150);
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>c.captureStream(4)});
  Object.defineProperty(navigator.mediaDevices,'enumerateDevices',{configurable:true,value:async()=>[]});
 });
 await page.getByRole('button',{name:'Ouvrir la caméra',exact:true}).click();
 await page.waitForFunction(()=>[...document.querySelectorAll('input')].some(x=>x.value==='FR7630006000011234567890189'),{},{timeout:60000});
 await page.waitForFunction(()=>[...document.querySelectorAll('input')].some(x=>x.value==='CAMILLE AUTO'),{},{timeout:60000});
 assert.equal(await page.getByRole('textbox',{name:'BIC',exact:true}).inputValue(),'PSSTFRPPXXX');
 assert.equal(await page.getByLabel('Titulaire du compte').inputValue(),'CAMILLE AUTO');
 assert.equal(await page.getByLabel('Nom de la banque').inputValue(),'BANQUE EXEMPLE');
 assert.ok(await page.evaluate(()=>window.previewReads>=2));assert.equal(writes,0);assert.deepEqual(external,[]);
 assert.equal(await page.getByRole('button',{name:'Enregistrer mon RIB vérifié'}).isDisabled(),true);
 assert.equal(await page.getByRole('button',{name:'Relancer l’analyse du document',exact:true}).count(),0);
 console.log('PASS: stable IBAN-only preview auto-captures; real full-file OCR automatically completes holder/BIC/bank; no analyze click, no save/write and no third-party request.');
}catch(error){console.error(error);for(const c of browser.contexts())for(const p of c.pages())console.error(await p.locator('body').innerText());throw error;}finally{await browser.close();}
