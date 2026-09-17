import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const base=process.env.BASE_URL||'http://127.0.0.1:4187';
const profile={display_name:'Camille',qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],latitude:null,longitude:null,radius_km:30,accepted_shifts:[],preferred_shifts:[],visible:true,rpps_status:'NOT_CHECKED',details:{firstName:'Camille',lastName:'Test',city:'Paris',phone:'0600000000',birthDate:'1990-01-01',address:'1 rue Test',postalCode:'75001'}};
const browser=await chromium.launch({channel:'msedge'});let server;
try{
 const page=await browser.newPage();let request=null,profileWrites=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/v1/**',async route=>{const p=new URL(route.request().url()).pathname;let json=[];
 if(p.endsWith('/auth/me'))json={id:'fixture',family:'NURSE',email:'fixture@example.invalid',organizations:[]};
 else if(p.endsWith('/auth/csrf'))json={csrfToken:'fixture'};
 else if(p.endsWith('/profile')){if(route.request().method()==='PUT'){profileWrites++;assert.deepEqual(route.request().postDataJSON().details,profile.details);json={ok:true};}else json=profile;}
 else if(p.endsWith('/reference-data'))json={ideServices:[],blockSpecialties:[]};
 else if(p.endsWith('/me/bank-details'))json={iban:null,document:null};
 else if(p.endsWith('/me/personal-corrections')){if(route.request().method()==='POST'){const b=route.request().postDataJSON();assert.deepEqual(b,{field:'city',value:'Lyon'});request={id:'request-1',field:b.field,proposed_value:b.value,status:'REQUESTED'};json=request;}else json={request};}
 else if(p.includes('psc'))json={enabled:false};
 await route.fulfill({status:200,json});});
 await page.goto(base+'/profil');await page.getByRole('button',{name:'Tout refuser',exact:true}).click();await page.getByRole('heading',{name:'Informations personnelles',exact:true}).waitFor();
 await page.getByText('Adresse postale',{exact:true}).click();
 for(const label of ['Prénom','Nom','E-mail','Ville','Téléphone','Date de naissance','Adresse','Code postal'])assert.equal(await page.getByRole('textbox',{name:label,exact:true}).count()?await page.getByRole('textbox',{name:label,exact:true}).evaluate(e=>e.readOnly):await page.getByLabel(label,{exact:true}).evaluate(e=>e.readOnly),true,label);
 await page.getByRole('button',{name:'Enregistrer les modifications',exact:true}).first().click();await page.getByText('Modifications enregistrées.',{exact:true}).waitFor();assert.equal(profileWrites,1);
 await page.getByRole('button',{name:'Demander une correction à l’administrateur',exact:true}).click();await page.getByLabel('Information à corriger',{exact:true}).selectOption('city');await page.getByLabel('Nouvelle valeur demandée').fill('Lyon');await page.getByRole('button',{name:'Envoyer la demande de correction',exact:true}).click();await page.getByText(/Demande en cours : Ville/).waitFor();assert.equal(await page.getByRole('textbox',{name:'Ville',exact:true}).inputValue(),'Paris');assert.equal(profileWrites,1);
 for(const width of [375,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
 assert.deepEqual(errors,[]);
 const root=resolve('dist-admin');server=createServer(async(req,res)=>{try{const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root))throw Error('path');const data=await readFile(req.url==='/'?resolve(root,'index.html'):file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[extname(req.url==='/'?'index.html':file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const admin=await browser.newPage();let applied=0;
 await admin.route('**/api/v1/admin/**',async route=>{const p=new URL(route.request().url()).pathname;let json={};if(p.endsWith('/me'))json={id:'admin',email:'admin@example.invalid',role:'OWNER',permissions:['accounts','accounts:write']};else if(p.endsWith('/csrf'))json={csrfToken:'fixture'};else if(p.endsWith('/personal-corrections'))json={total:1,items:[{...request,email:'fixture@example.invalid',previous_value:'Paris',status:applied?'COMPLETED':'REQUESTED'}]};else if(p.endsWith('/approve')){const b=route.request().postDataJSON();assert.equal(b.identityVerified,true);assert.ok(b.reason.length>=8);applied++;json={ok:true};}await route.fulfill({status:200,json});});
 await admin.goto(`http://127.0.0.1:${server.address().port}/#/personal-corrections`);await admin.getByRole('button',{name:'Valider la correction',exact:true}).click();await admin.getByLabel('Justification (journalisée)').fill('Vérification sur dossier fictif');await admin.getByRole('button',{name:'Confirmer l’opération'}).click();assert.equal(applied,0);await admin.getByRole('checkbox').check();await admin.getByRole('button',{name:'Confirmer l’opération'}).click();await admin.getByText('Corrigée',{exact:true}).waitFor();assert.equal(applied,1);
 console.log('PASS personal fields read-only, professional save, request without profile mutation, mobile/desktop, admin review and identity confirmation.');
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
