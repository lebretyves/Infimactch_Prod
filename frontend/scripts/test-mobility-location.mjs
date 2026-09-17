import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4187';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage(); const writes=[],queries=[],errors=[];let fail=false;
 let profile={display_name:'Test fictif',qualifications:[],skills:[],experience:[],available:[],unavailable:[],accepted_shifts:[],preferred_shifts:[],visible:true,rpps_status:'pending',latitude:48.85,longitude:2.35,radius_km:25,details:{city:'Paris',firstName:'Test',lastName:'Fictif',postalCode:'75001'}};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;let json={};
  if(path.endsWith('/auth/me'))json={id:'fixture-nurse',email:'fixture@example.invalid',family:'NURSE',organizations:[]};
  else if(path.endsWith('/profile')){if(route.request().method()==='PUT'){const body=route.request().postDataJSON();writes.push(body);profile={...profile,...body,display_name:body.displayName,radius_km:body.radiusKm};}json=profile;}
  else if(path.endsWith('/me/history'))json=[];
  else if(path.endsWith('/reference-data'))json={ideServices:[],blockSpecialties:[]};
  else if(path.endsWith('/auth/csrf'))json={csrfToken:'fixture'};
  else if(path.endsWith('/listings/locations/communes')){const q=url.searchParams.get('q');queries.push(q);if(q==='Ancien')await new Promise(r=>setTimeout(r,1200));if(fail)return route.fulfill({status:503,json:{message:'Indisponible'}});json={items:q==='Introuvable'?[]:[{label:q==='Lyon'?'Lyon (69001)':'Nantes (44000)',latitude:q==='Lyon'?45.76:47.239367,longitude:q==='Lyon'?4.83:-1.555335}]};}
  await route.fulfill({json});
 });
 await page.goto(base+'/calendrier');const consent=page.getByRole('button',{name:'Tout refuser',exact:true});if(await consent.count())await consent.click();
 const input=page.getByRole('combobox',{name:'Ville de référence'}),save=page.getByRole('button',{name:'Enregistrer ma mobilité',exact:true});
 await input.fill('44');await page.waitForTimeout(450);assert.equal(queries.length,0);
 await input.fill('44000');await page.getByRole('option',{name:'Nantes (44000)'}).waitFor();await input.press('ArrowDown');await input.press('Enter');assert.equal(await input.inputValue(),'Nantes (44000)');
 await save.click();await page.getByText('Zone de mobilité enregistrée.',{exact:true}).waitFor();assert.equal(writes.at(-1).details.mobilityCity,'Nantes (44000)');assert.equal(writes.at(-1).details.city,'Paris');assert.equal(writes.at(-1).latitude,47.239367);assert.equal(writes.at(-1).longitude,-1.555335);
 await input.fill('Lyon');await save.click();await page.getByText('Choisissez une commune dans les suggestions avant d’enregistrer.',{exact:true}).waitFor();assert.equal(writes.length,1);
 await input.focus();await page.getByRole('option',{name:'Lyon (69001)'}).click();await save.click();await page.getByText('Zone de mobilité enregistrée.',{exact:true}).waitFor();assert.equal(writes.at(-1).latitude,45.76);
 await input.fill('Ancien');await page.waitForTimeout(450);await input.fill('Lyon');await page.getByRole('option',{name:'Lyon (69001)'}).waitFor();await page.waitForTimeout(1200);assert.equal(await page.getByRole('option',{name:'Nantes (44000)'}).count(),0);
 await input.fill('Introuvable');await page.getByText('Aucune commune trouvée. Vérifiez la ville ou le code postal.').waitFor();fail=true;await input.fill('Paris');await page.getByText('La recherche est indisponible. Réessayez en modifiant votre saisie.').waitFor();fail=false;
 await input.fill('44000');await page.getByRole('option',{name:'Nantes (44000)'}).waitFor();
 for(const width of [375,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
 assert.deepEqual(errors,[]);console.log('PASS mobility: postal/city autocomplete, keyboard, coordinates saved, personal city preserved, unmatched city blocked, stale response ignored, empty/error states, mobile/desktop.');
}finally{await browser.close();}
