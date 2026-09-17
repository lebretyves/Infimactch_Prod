import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const b=await chromium.launch({channel:'msedge',headless:true});
try {
const p=await b.newPage();
let profile; const writes=[];
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route('**/api/**',async r=>{
 const path=new URL(r.request().url()).pathname;
 let json=[];
 if(path.endsWith('/auth/me'))json={id:'fixture',email:'fixture@example.invalid',family:'NURSE',organizations:[]};
 else if(path.endsWith('/profile')) { if(r.request().method()==='PUT'){const body=r.request().postDataJSON();writes.push(body);profile={...profile,...body,display_name:body.displayName};} json=profile??={display_name:'Camille',qualifications:['IDE','IADE'],skills:[],experience:[{service:'CHIRURGIE',establishment:'Centre de demonstration',start:'2020-01-01T00:00:00Z',end:'2021-02-02T00:00:00Z'}],available:[],unavailable:[],latitude:null,longitude:null,radius_km:25,accepted_shifts:[],preferred_shifts:[],visible:true,rpps_status:'VERIFIED',details:{ideDiplomaYear:2015}}; }
 else if(path.endsWith('/reference-data'))json={ideServices:['CHIRURGIE','PEDIATRIE'],blockSpecialties:[]};
 else if(path.endsWith('/me/bank-details'))json={iban:null,document:null};
 await r.fulfill({json});
});
await p.goto('http://127.0.0.1:4193/profil');
const consent=p.getByRole('button',{name:'Tout refuser',exact:true});if(await consent.count())await consent.click();
const section=p.locator('section').filter({has:p.getByRole('heading',{name:'Qualifications et exp',exact:false})});
await section.waitFor();
const bg=l=>l.evaluate(e=>getComputedStyle(e).backgroundColor);
const year=p.getByLabel('Année du diplôme IDE',{exact:true});
assert.equal(await bg(year),'rgb(241, 243, 245)');
assert.equal(await bg(p.getByLabel('Année du diplôme IADE',{exact:true})),'rgb(255, 255, 255)');
assert.equal(await year.isEditable(),true);
await year.fill('');assert.equal(await bg(year),'rgb(255, 255, 255)');
await year.fill('2015');assert.equal(await bg(year),'rgb(241, 243, 245)');
assert.equal(await p.getByLabel(/^Service 1/).count(),0);
await p.getByRole('button',{name:'Modifier l’expérience 1',exact:true}).click();
assert.equal(await bg(p.getByLabel(/^Service 1/)),'rgb(241, 243, 245)');
await p.getByLabel('Établissement 1',{exact:true}).fill('Brouillon annule');
await p.getByRole('button',{name:'Annuler',exact:true}).click();
assert.equal(await section.getByText('Brouillon annule',{exact:true}).count(),0);
await p.getByRole('button',{name:'Modifier l’expérience 1',exact:true}).click();
await p.getByLabel('Établissement 1',{exact:true}).fill('Centre modifie');
await p.getByRole('button',{name:'Enregistrer l’expérience',exact:true}).click();
assert.equal(await section.getByText('Centre modifie',{exact:true}).count(),1);
assert.equal(writes.length,0);
await p.getByRole('button',{name:'+ Ajouter une expérience',exact:true}).click();
assert.equal(await bg(p.getByLabel(/^Service 2/)),'rgb(255, 255, 255)');
await p.getByRole('button',{name:'Enregistrer l’expérience',exact:true}).click();
assert.equal(await p.getByRole('alert').filter({hasText:'Choisissez un service'}).count(),1);
await p.getByRole('button',{name:'Annuler',exact:true}).click();
assert.equal(await section.getByRole('article').count(),1);
await p.getByRole('button',{name:'Enregistrer les modifications',exact:true}).first().click();
await p.getByText('Modifications enregistrées.',{exact:true}).waitFor();
assert.equal(writes.at(-1).experience[0].establishment,'Centre modifie');
await p.reload();await section.waitFor();assert.equal(await section.getByText('Centre modifie',{exact:true}).count(),1);
await mkdir('artifacts/profile-filled',{recursive:true});
for(const width of [1440,375]){
 await p.setViewportSize({width,height:1100});await section.scrollIntoViewIfNeeded();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await section.screenshot({path:`artifacts/profile-filled/qualifications-${width}.png`});
}
await p.getByRole('button',{name:'Supprimer l’expérience 1',exact:true}).click();
assert.equal(await section.getByRole('article').count(),0);
await p.getByRole('button',{name:'Enregistrer les modifications',exact:true}).first().click();
await p.getByText('Modifications enregistrées.',{exact:true}).waitFor();
assert.equal(writes.at(-1).experience.length,0);
assert.deepEqual(errors,[]);console.log('PASS: filled/empty styles, editing, responsive 375/1440, no browser errors');
}finally{await b.close()}
