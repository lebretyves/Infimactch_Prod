import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
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
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/profil');await page.getByRole('button',{name:'Tout refuser',exact:true}).click();await page.getByRole('heading',{name:'Préremplir mes expériences avec mon CV'}).waitFor();
 const input=page.getByLabel('Importer mon CV (PDF, JPEG ou PNG)');
 await input.setInputFiles({name:'cv.pdf',mimeType:'application/pdf',buffer:bankPdf(lines)});await page.getByLabel('Établissement proposé 1',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Établissement proposé 1',{exact:true}).inputValue(),'CHU Exemple');assert.equal(await page.getByLabel('Service proposé 1',{exact:true}).inputValue(),'CARDIOLOGIE');assert.equal(await page.getByLabel('Début proposé 1',{exact:true}).inputValue(),'2020-02-01');assert.equal(await page.getByLabel('Fin proposée 2',{exact:true}).inputValue(),'2023-06-30');assert.equal(writes,0);
 assert.equal(await page.getByRole('button',{name:'Ajouter les expériences vérifiées au profil'}).isDisabled(),true);
 await page.getByLabel('J’ai vérifié les expériences retenues et leurs dates avec mon CV.').check();await page.getByRole('button',{name:'Ajouter les expériences vérifiées au profil'}).click();await page.getByLabel('Établissement 1',{exact:true}).waitFor();assert.equal(writes,0);
 await page.getByRole('button',{name:'Enregistrer les modifications',exact:true}).first().click();await page.getByText('Modifications enregistrées.',{exact:true}).waitFor();assert.equal(writes,1);
 await input.setInputFiles({name:'cv.pdf',mimeType:'application/pdf',buffer:bankPdf(lines)});await page.getByLabel('Établissement proposé 1',{exact:true}).waitFor();await page.getByLabel('J’ai vérifié les expériences retenues et leurs dates avec mon CV.').check();await page.getByRole('button',{name:'Ajouter les expériences vérifiées au profil'}).click();await page.getByText(/2 doublon\(s\) ignoré\(s\)/).waitFor();assert.equal(await page.getByLabel('Établissement 3',{exact:true}).count(),0);
 await input.setInputFiles({name:'invalid.pdf',mimeType:'application/pdf',buffer:Buffer.from('invalid')});await page.getByRole('alert').filter({hasText:'illisible'}).waitFor();assert.equal(writes,1);
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1800;c.height=360;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='32px monospace';['EXPERIENCES PROFESSIONNELLES','01/02/2020 - 31/03/2021','CHU Exemple | Cardiologie','Infirmiere IDE'].forEach((line,i)=>x.fillText(line,35,55+i*65));return c.toDataURL('image/png').split(',')[1];});
 await input.setInputFiles({name:'cv-photo.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.getByLabel('Établissement proposé 1',{exact:true}).waitFor({timeout:65000});assert.equal(await page.getByLabel('Service proposé 1',{exact:true}).inputValue(),'CARDIOLOGIE');assert.equal(writes,1);
 for(const width of [375,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(-12).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,text:e.textContent.slice(0,65)})))));}
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('CHU Exemple')),false);
 console.log('PASS CV text PDF + real image OCR, real parser, editable review, explicit add/save, protected identity/diplomas, duplicate import, invalid PDF, mobile/desktop, no third-party requests or browser storage. Parses: '+parses);
}finally{await browser.close();}
