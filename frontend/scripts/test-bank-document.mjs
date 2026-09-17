import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'msedge'}),base=process.env.BASE_URL||'http://127.0.0.1:4187';
try {
 const context=await browser.newContext();let document=null;const writes=[];
 await context.route('**/api/**',route=>{const path=new URL(route.request().url()).pathname;let json=[];
  if(path.endsWith('/auth/me'))json={id:'fixture-nurse',family:'NURSE',email:'fixture@example.invalid',organizations:[]};
  else if(path.endsWith('/profile'))json={display_name:'Camille',qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],details:{},rpps_status:'FOUND',accepted_shifts:[],preferred_shifts:[],visible:true};
  else if(path.endsWith('/auth/csrf'))json={csrfToken:'fixture'};
  else if(path.endsWith('/me/bank-details'))json={iban:null,document,required:!document};
  else if(path.endsWith('/me/bank-document')){if(route.request().method()==='PUT'){writes.push({body:route.request().postDataJSON(),key:route.request().headers()['idempotency-key']});document={id:'fixture-bank-file',mime:'application/pdf',size_bytes:20,created_at:'2030-01-01T12:00:00Z'};json={id:document.id,status:'READY'};}else return route.fulfill({status:200,contentType:'application/pdf',body:'%PDF-1.4\nfictional fixture'});}
  return route.fulfill({status:200,json});
 });
 const page=await context.newPage();await page.goto(base+'/dossier');await page.getByRole('button',{name:'Tout refuser',exact:true}).click();await page.getByRole('heading',{name:'Mon RIB de démonstration'}).waitFor();
 await page.getByRole('complementary',{name:'RIB à compléter'}).waitFor();
 await page.goto(base+'/historique');await page.getByRole('complementary',{name:'RIB à compléter'}).waitFor();
 await page.setViewportSize({width:375,height:800});
 await page.getByRole('link',{name:'Ajouter mon RIB dans mon dossier'}).click();
 await page.waitForFunction(()=>document.activeElement?.id==='rib' && document.getElementById('rib').getBoundingClientRect().top<250);
 assert.equal(new URL(page.url()).hash,'#rib');

 const file=page.getByLabel('Importer un RIB (PDF, JPEG ou PNG)');const button=page.getByRole('button',{name:'Enregistrer mon fichier RIB'});
 await file.setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('fictional')});await page.getByRole('alert').filter({hasText:'3 Mo maximum'}).waitFor();assert.equal(writes.length,0);
 await file.setInputFiles({name:'big.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(3*1024*1024+1)});assert.equal(await button.isDisabled(),true);
 await file.setInputFiles({name:'rib-fictional.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nfictional only')});assert.equal(await button.isDisabled(),true);
 await page.getByRole('checkbox',{name:'Ce RIB contient uniquement des données fictives.'}).check();await button.click();await page.getByRole('button',{name:'Télécharger mon RIB'}).waitFor();assert.equal(writes.length,1);assert.equal(writes[0].body.fictional,true);assert.ok(writes[0].key);assert.equal(writes[0].body.mime,'application/pdf');
 await page.waitForFunction(()=>!document.querySelector('aside[aria-label="RIB à compléter"]'));
 assert.equal(await page.getByLabel('Prendre une photo du RIB').getAttribute('capture'),'environment');assert.equal(await page.getByLabel('Prendre une photo du justificatif').getAttribute('capture'),'environment');
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Télécharger mon RIB'}).click();const download=await downloadEvent;assert.equal(download.suggestedFilename(),'rib-fictif.pdf');await download.cancel();
 assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('fictional only')),false);
 fs.mkdirSync('../InfiMatch/docs/quality',{recursive:true});for(const width of [375,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:`../InfiMatch/docs/quality/bank-document-${width}.png`,fullPage:true});}
 console.log('PASS nonblocking reminder, private RIB upload/download with exact contract/idempotency, format/3MiB limits, fictional consent, capture controls both types, no storage, reminder disappears, 375/1440. Fixtures only; no real camera or documents.');
}finally{await browser.close();}
