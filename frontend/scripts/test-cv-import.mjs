import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {positionedCvPdf,twoColumnCv} from './cv-pdf-fixture.mjs';
import {bankPdf} from './bank-pdf-fixture.mjs';
const require=createRequire(import.meta.url);
const parserPath=new URL('../../backend/dist/profiles/cv-parser.js',import.meta.url);
const {parseCvExperience}=require(existsSync(parserPath)?fileURLToPath(parserPath):'../../InfiMatch/backend/dist/profiles/cv-parser.js');
const base=process.env.BASE_URL||'http://127.0.0.1:4187';
const profile={display_name:'Camille',qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],latitude:null,longitude:null,radius_km:30,accepted_shifts:[],preferred_shifts:[],visible:true,rpps_status:'NOT_CHECKED',details:{firstName:'Camille',lastName:'Test',city:'Paris'}};
const lines=['CAMILLE TEST','EXPERIENCES PROFESSIONNELLES','01/02/2020 - 31/03/2021 | CHU Exemple | Cardiologie','Infirmiere IDE','Avril 2021 - juin 2023 | Clinique Test | Urgences','FORMATIONS','2015 - 2018 Diplome infirmier'];
const browser=await chromium.launch({channel:'msedge'});
try{
 const context=await browser.newContext();let writes=0,parses=0;const external=[],errors=[];
 await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==new URL(base).origin){external.push(url.origin);return route.abort();}const p=url.pathname;if(!p.startsWith('/api/'))return route.continue();let json=[];
 if(p.endsWith('/auth/me'))json={id:'cv-fixture',family:'NURSE',email:'fixture@example.invalid',organizations:[]};
 else if(p.endsWith('/auth/csrf'))json={csrfToken:'fixture'};
 else if(p.endsWith('/profile')){if(route.request().method()==='PUT'){writes++;const b=route.request().postDataJSON();assert.deepEqual(b.details,profile.details);assert.deepEqual(b.qualifications,['IDE']);assert.equal(b.experience.length,2);profile.experience=b.experience;json={ok:true};}else json=profile;}
 else if(p.endsWith('/reference-data'))json={ideServices:['CARDIOLOGIE','URGENCES','AUTRE'],blockSpecialties:[]};
 else if(p.endsWith('/me/bank-details'))json={iban:null,document:null};
 else if(p.endsWith('/me/personal-corrections'))json={request:null};
 else if(p.endsWith('/profile/cv/parse')){const b=route.request().postDataJSON();assert.deepEqual(Object.keys(b),['text']);parses++;json=parseCvExperience(b.text);}
 else if(p.includes('psc'))json={enabled:false};
 await route.fulfill({status:200,json});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/profil');await page.getByRole('button',{name:'Tout refuser',exact:true}).click();await page.locator('summary').filter({hasText:'Importer un CV'}).click();await page.getByRole('heading',{name:'Préremplir mes expériences avec mon CV'}).waitFor();
 const input=page.getByLabel('Importer mon CV (PDF, JPEG ou PNG)');
 await input.setInputFiles({name:'cv.pdf',mimeType:'application/pdf',buffer:bankPdf(lines)});await page.getByLabel('Établissement proposé 1',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Établissement proposé 1',{exact:true}).inputValue(),'CHU Exemple');assert.equal(await page.getByLabel('Service proposé 1',{exact:true}).inputValue(),'CARDIOLOGIE');assert.equal(await page.getByLabel('Début proposé 1',{exact:true}).inputValue(),'2020-02-01');assert.equal(await page.getByLabel('Fin proposée 2',{exact:true}).inputValue(),'2023-06-30');assert.equal(writes,0);
 assert.equal(await page.getByRole('button',{name:'Ajouter les expériences vérifiées au profil'}).isDisabled(),true);
 await page.getByLabel('J’ai vérifié les expériences retenues et leurs dates avec mon CV.').check();await page.getByRole('button',{name:'Ajouter les expériences vérifiées au profil'}).click();await page.getByRole('button',{name:'Modifier l’expérience 1',exact:true}).waitFor();assert.equal(await page.getByText('CHU Exemple',{exact:true}).count(),1);assert.equal(writes,0);
 await page.getByRole('button',{name:'Enregistrer les modifications',exact:true}).first().click();await page.getByText('Modifications enregistrées.',{exact:true}).waitFor();assert.equal(writes,1);
 await input.setInputFiles({name:'cv.pdf',mimeType:'application/pdf',buffer:bankPdf(lines)});await page.getByLabel('Établissement proposé 1',{exact:true}).waitFor();await page.getByLabel('J’ai vérifié les expériences retenues et leurs dates avec mon CV.').check();await page.getByRole('button',{name:'Ajouter les expériences vérifiées au profil'}).click();await page.getByText(/2 doublon\(s\) ignoré\(s\)/).waitFor();assert.equal(await page.getByRole('button',{name:/Modifier l’expérience/}).count(),2);
 await input.setInputFiles({name:'cv-two-columns.pdf',mimeType:'application/pdf',buffer:positionedCvPdf(twoColumnCv)});
 await page.getByLabel('Établissement proposé 1',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Établissement proposé 1',{exact:true}).inputValue(),'CHU Exemple');
 assert.equal(await page.getByLabel('Établissement proposé 2',{exact:true}).inputValue(),'Clinique Test');
 assert.equal(await page.getByLabel('Début proposé 1',{exact:true}).inputValue(),'2020-01-01');
 assert.equal(await page.getByLabel('Fin proposée 2',{exact:true}).inputValue(),'2022-04-30');
 assert.equal(await page.getByLabel('Établissement proposé 3',{exact:true}).count(),0);
 await input.setInputFiles({name:'cv-multiline.pdf',mimeType:'application/pdf',buffer:bankPdf(['EXPERIENCES PROFESSIONNELLES','Janvier','2020 -','Mars','2021 | CHU Exemple | Cardiologie','FORMATIONS','2015 - 2018 Diplome infirmier'])});
 await page.getByLabel('Établissement proposé 1',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Début proposé 1',{exact:true}).inputValue(),'2020-01-01');
 assert.equal(await page.getByLabel('Fin proposée 1',{exact:true}).inputValue(),'2021-03-31');
 await input.setInputFiles({name:'invalid.pdf',mimeType:'application/pdf',buffer:Buffer.from('invalid')});await page.getByRole('alert').filter({hasText:'illisible'}).waitFor();assert.equal(writes,1);
 await input.setInputFiles({name:'cv-no-period.pdf',mimeType:'application/pdf',buffer:bankPdf(['EXPERIENCES PROFESSIONNELLES','CHU Exemple | Cardiologie sans periode precise'])});
 const preview=page.locator('details').filter({has:page.getByText('Voir un aperçu du texte lu dans mon CV',{exact:true})}).last();
 await preview.waitFor();assert.equal(await preview.getAttribute('open'),null);
 await preview.locator('summary').click();assert.match(await preview.locator('pre').innerText(),/sans periode precise/);
 assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('sans periode precise')),false);
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1800;c.height=360;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='32px monospace';['EXPERIENCES PROFESSIONNELLES','01/02/2020 - 31/03/2021','CHU Exemple | Cardiologie','Infirmiere IDE'].forEach((line,i)=>x.fillText(line,35,55+i*65));return c.toDataURL('image/png').split(',')[1];});
 await input.setInputFiles({name:'cv-photo.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.getByLabel('Établissement proposé 1',{exact:true}).waitFor({timeout:65000});assert.equal(await page.getByLabel('Service proposé 1',{exact:true}).inputValue(),'CARDIOLOGIE');assert.equal(writes,1);assert.equal(await page.getByText('Voir un aperçu du texte lu dans mon CV',{exact:true}).count(),0);
 for(const width of [375,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(-12).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,text:e.textContent.slice(0,65)})))));}
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('CHU Exemple')),false);
 console.log('PASS CV text PDF, shuffled two-column PDF, multiline dates, folded local diagnostic + real image OCR, real parser, editable review, explicit add/save, protected identity/diplomas, duplicate import, invalid PDF, mobile/desktop, no third-party requests or browser storage. Parses: '+parses);
}finally{await browser.close();}
