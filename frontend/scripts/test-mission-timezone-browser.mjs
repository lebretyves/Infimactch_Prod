import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const p=await browser.newPage({timezoneId:'Asia/Tokyo'});let payload;
 const org={id:'org',kind:'ESTABLISHMENT',name:'Etablissement fictif',address:'Adresse fictive',finess:null,siret:null,referent:'Test'};
 const mission={id:'fixture',agency_id:null,establishment_id:'org',title:'Mission fictive DOM',description:'Description de test uniquement',qualification:'IDE',service:'CHIRURGIE',population:'ADULT',block:'NONE',required_skills:[],desired_skills:[],min_experience_months:0,start_at:'2030-07-10T12:00:00Z',end_at:'2030-07-10T20:00:00Z',timezone:'America/Guadeloupe',shift:'DAY',address:'Adresse fictive',latitude:16,longitude:-61,hourly_salary:20,status:'DRAFT',assignments:[],events:[]};
 await p.route('**/api/**',async r=>{const path=new URL(r.request().url()).pathname;let json=[];
 if(path.endsWith('/auth/me'))json={id:'test',email:'test@example.invalid',family:'ENTERPRISE',organizations:[org]};
 else if(path.endsWith('/me/organizations'))json={organizations:[org],links:[]};
 else if(path.endsWith('/reference-data'))json={ideServices:['CHIRURGIE'],blockSpecialties:[]};
 else if(path.endsWith('/missions/fixture')){if(r.request().method()==='PUT')payload=r.request().postDataJSON();json=mission;}
 await r.fulfill({json});});
 await p.goto('http://127.0.0.1:4193/gestion/missions/fixture/modifier');
 const reject=p.getByRole('button',{name:'Tout refuser',exact:true});if(await reject.count())await reject.click();
 await p.getByLabel(/^Début de mission/).waitFor({timeout:5000});
 assert.equal(await p.getByLabel('Fuseau horaire de la mission').inputValue(),'America/Guadeloupe');
 assert.equal(await p.getByLabel(/^Début de mission/).inputValue(),'2030-07-10T08:00');
 assert.equal(await p.getByLabel(/^Fin de mission/).inputValue(),'2030-07-10T16:00');
 await p.getByRole('button',{name:'Enregistrer les modifications',exact:true}).click();
 await p.waitForURL('**/gestion/missions/fixture');
 assert.equal(payload.timezone,'America/Guadeloupe');assert.equal(payload.start,mission.start_at);assert.equal(payload.end,mission.end_at);
 await p.getByText(/08:00/).first().waitFor({timeout:10000});
 console.log('PASS browser Tokyo: Guadeloupe local 08–16 displayed and unchanged UTC/timezone saved; managed detail renders 08:00');
}finally{await browser.close()}
