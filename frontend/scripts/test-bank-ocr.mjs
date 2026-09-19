import assert from 'node:assert/strict';
import {bankPdf} from './bank-pdf-fixture.mjs';
import {chromium} from 'playwright';
import {validIban,parseBankText,frenchBankParts} from '../src/lib/bankFields.ts';
const iban='FR7630006000011234567890189';
assert.equal(parseBankText('Titulaire: CAMILLE TEST IBAN: '+iban+' BIC: PSSTFRPPXXX').holder,'CAMILLE TEST');
assert.equal(parseBankText('Titulaire du compte :\n\nCAMILLE TEST\nIBAN: '+iban).holder,'CAMILLE TEST');
assert.equal(parseBankText('Intitulé du compte : CAMILLE TEST').holder,'CAMILLE TEST');
assert.equal(parseBankText('Titulaire(s) du compte CAMILLE TEST').holder,'CAMILLE TEST');
assert.equal(parseBankText('B.I.C. (Bank Identifier Code) :\nPSSTFRPPXXX').bic,'PSSTFRPPXXX');
assert.equal(parseBankText('Titulaire :\nIBAN: '+iban).holder,'');
assert.equal(parseBankText('Banque :\nBANQUE EXEMPLE').bankName,'BANQUE EXEMPLE');
assert.ok(validIban(iban));assert.ok(!validIban(iban.slice(0,-1)+'7'));
assert.equal(parseBankText('IBAN: '+iban).holder,'');assert.equal(parseBankText('Banque: BANQUE EXEMPLE').bankName,'BANQUE EXEMPLE');assert.equal(parseBankText('Banque\nBANQUE EXEMPLE').bankName,'BANQUE EXEMPLE');
assert.deepEqual(frenchBankParts(iban),{bank:'30006',branch:'00001',account:'12345678901',key:'89'});
const base=process.env.BASE_URL||'http://127.0.0.1:4187';
assert.equal(parseBankText('Titulaire du compte\nCAMILLE TEST\nBanque\nBANQUE EXEMPLE').holder,'CAMILLE TEST');
assert.equal(parseBankText('Titulaire du compte\nIBAN: '+iban).holder,'');
const browser=await chromium.launch({channel:'msedge'});
try{
 const context=await browser.newContext();let details=null,attachment=null;const writes=[],external=[],resources=[];
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==new URL(base).origin){external.push(url.origin);return route.abort();}if(!url.pathname.includes('/api/')){resources.push(url.pathname);return route.continue();}const path=url.pathname;let json=[];
 if(path.endsWith('/auth/me'))json={id:'fixture-nurse',family:'NURSE',email:'fixture@example.invalid',organizations:[]};
 else if(path.endsWith('/profile'))json={display_name:'Camille',qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],details:{},rpps_status:'FOUND',accepted_shifts:[],preferred_shifts:[],visible:true};
 else if(path.endsWith('/auth/csrf'))json={csrfToken:'fixture'};
 else if(path.endsWith('/me/bank-details')&&route.request().method()==='GET')json={iban:details?'FR14***2606':null,details,document:attachment,required:!details};
 else if(path.endsWith('/me/bank-document')||path.endsWith('/me/bank-details')){const body=route.request().postDataJSON();writes.push(body);details={iban:body.iban,bic:body.bic,holder:body.holder,bankName:body.bankName};attachment=body.contentBase64?{id:'fixture-file',mime:body.mime,size_bytes:100,created_at:'2030-01-01T00:00:00Z'}:null;json={status:'READY'};}
 return route.fulfill({status:200,json});});
 const page=await context.newPage();await page.goto(base+'/historique');await page.getByRole('button',{name:'Tout refuser',exact:true}).click();await page.getByRole('link',{name:'Ajouter mon RIB dans mon dossier'}).click();await page.getByRole('heading',{name:'Mon RIB',exact:true}).waitFor();await page.waitForFunction(()=>document.activeElement?.id==='rib'&&document.getElementById('rib').getBoundingClientRect().top<250);
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=420;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1600,420);ctx.fillStyle='black';ctx.font='38px monospace';['RELEVE IDENTITE BANCAIRE','IBAN: FR76 3000 6000 0112 3456 7890 189','BIC: PSSTFRPPXXX','Titulaire: CAMILLE TEST','Banque: BANQUE EXEMPLE'].forEach((line,i)=>ctx.fillText(line,40,65+i*70));return canvas.toDataURL('image/png').split(',')[1];});
 const input=page.getByLabel('Importer un RIB (PDF, JPEG ou PNG)');
 await input.setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('fixture')});await page.getByRole('alert').filter({hasText:'3 Mo maximum'}).waitFor();await input.setInputFiles({name:'large.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(3*1024*1024+1)});assert.equal(writes.length,0);
 await input.setInputFiles({name:'synthetic-rib.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.getByRole('heading',{name:'Vérifier les coordonnées',exact:true}).waitFor({timeout:60000});
 assert.equal(await page.getByRole('textbox',{name:'IBAN',exact:true}).inputValue(),iban);
 assert.equal(await page.getByRole('textbox',{name:/^BIC/}).inputValue(),'PSSTFRPPXXX');
 assert.equal(await page.getByLabel('Titulaire du compte').inputValue(),'CAMILLE TEST');assert.equal(await page.getByLabel('Nom de la banque').inputValue(),'BANQUE EXEMPLE');
 assert.equal(writes.length,0);assert.equal(await page.getByRole('button',{name:'Enregistrer mon RIB vérifié'}).isDisabled(),true);
 await page.getByRole('checkbox',{name:/J’ai vérifié ces coordonnées/}).check();await page.getByRole('button',{name:'Enregistrer mon RIB vérifié'}).click();await page.getByRole('heading',{name:'Coordonnées enregistrées'}).waitFor();
 assert.equal(writes.length,1);assert.equal(writes[0].iban,iban);assert.equal(writes[0].reviewed,true);assert.equal(writes[0].fictional,undefined);
 await page.getByRole('button',{name:'Modifier mon RIB'}).click();await input.setInputFiles({name:'synthetic-text.pdf',mimeType:'application/pdf',buffer:bankPdf(['IBAN: '+iban,'BIC: PSSTFRPPXXX','Titulaire: CAMILLE TEST','Banque: BANQUE EXEMPLE'])});await page.getByRole('heading',{name:'Vérifier les coordonnées',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'IBAN',exact:true}).inputValue(),iban);assert.equal(await page.getByLabel('Titulaire du compte').inputValue(),'CAMILLE TEST');assert.equal(await page.getByLabel('Nom de la banque').inputValue(),'BANQUE EXEMPLE');
 await input.setInputFiles({name:'invalid.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a PDF')});
 await page.getByRole('alert').last().waitFor();await page.getByRole('button',{name:'Relancer l’analyse du document',exact:true}).click();await page.getByText('Deux analyses n’ont pas fourni tous les champs.',{exact:false}).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'IBAN',exact:true}).inputValue(),'');await page.getByText('Deux analyses n’ont pas fourni tous les champs.',{exact:false}).waitFor();
 await input.setInputFiles({name:'new.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.getByRole('heading',{name:'Vérifier les coordonnées',exact:true}).waitFor({timeout:60000});assert.equal(await page.getByRole('textbox',{name:'IBAN',exact:true}).inputValue(),iban);
 // Simulate a live camera using a canvas stream; the real OCR engine reads each frame.
 await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=420;const ctx=canvas.getContext('2d');
  function draw(){ctx.fillStyle='white';ctx.fillRect(0,0,1600,420);ctx.fillStyle='black';ctx.font='38px monospace';['RELEVE IDENTITE BANCAIRE',window.fixtureInvalid?'IBAN: FR76 3000 6000 0112 3456 7890 187':'IBAN: FR76 3000 6000 0112 3456 7890 189','BIC: PSSTFRPPXXX','Titulaire: CAMILLE CAMERA','Banque: BANQUE CAMERA'].forEach((line,i)=>ctx.fillText(line,40,65+i*70));}
  draw();window.fixtureTracks=[];window.fixtureTimer=setInterval(draw,150);
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{const stream=canvas.captureStream(6);window.fixtureTracks.push(...stream.getTracks());return stream;}});
  Object.defineProperty(navigator.mediaDevices,'enumerateDevices',{configurable:true,value:async()=>[]});
 });
 await page.getByRole('button',{name:'Ouvrir la caméra',exact:true}).click();
 await page.getByRole('region',{name:'Appareil photo du RIB'}).waitFor();
 await page.getByRole('region',{name:'Appareil photo du RIB'}).waitFor({state:'hidden',timeout:65000});
 await page.getByRole('heading',{name:'Vérifier les coordonnées',exact:true}).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'IBAN',exact:true}).inputValue(),iban);
 assert.equal(await page.getByRole('textbox',{name:/^BIC/}).inputValue(),'PSSTFRPPXXX');
 assert.equal(await page.getByLabel('Titulaire du compte').inputValue(),'CAMILLE CAMERA');
 assert.equal(await page.getByLabel('Nom de la banque').inputValue(),'BANQUE CAMERA');
 assert.equal(writes.length,1); // Capture/analysis never save bank details without confirmation.
 assert.ok(await page.evaluate(()=>window.fixtureTracks.every(t=>t.readyState==='ended')));
 await page.evaluate(()=>{window.fixtureInvalid=true;});
 await page.getByRole('button',{name:'Ouvrir la caméra',exact:true}).click();
 await page.getByText('Recherche des coordonnées… Gardez le RIB entier dans le cadre.',{exact:true}).waitFor();
 await page.waitForTimeout(4500);
 assert.equal(await page.getByRole('region',{name:'Appareil photo du RIB'}).isVisible(),true);
 await page.getByRole('button',{name:'Fermer la caméra',exact:true}).click();
 await page.waitForTimeout(1200);
 assert.ok(await page.evaluate(()=>{clearInterval(window.fixtureTimer);return window.fixtureTracks.every(t=>t.readyState==='ended');}));
 assert.equal(await page.getByLabel('Titulaire du compte').inputValue(),'CAMILLE CAMERA');
 for(const width of [375,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:`../InfiMatch/docs/quality/rib-review-${width}.png`,fullPage:true});}
 assert.deepEqual(external,[]);assert.ok(resources.some(x=>x.includes('/ocr/worker.min.js')));assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('FR7630006')),false);
 console.log('PASS automatic file analysis + real live camera OCR/autocapture/field mapping/track cleanup, real local Tesseract synthetic image + PDF.js text PDF, reminder SPA anchor and file limits, IBAN checksum, explicit review/save contract, invalid PDF x2/manual fallback, new file clears old fields, 375/1440, no external requests/storage.');
}finally{await browser.close();}
