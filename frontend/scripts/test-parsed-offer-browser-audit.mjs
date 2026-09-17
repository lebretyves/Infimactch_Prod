import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const avc='Prise en charge des urgences AVC (Alertes thrombolyses) amenés par les pompiers ou le SAMU';
const cardio='Vous assurez la surveillance des patients en cardiologie et en soins intensifs.';
const diploma='Diplôme d’État infirmier exigé.';
const title='Infirmer en cardiologie et soins intensifs';
const field=(key,value,evidence,state='MENTION')=>({key,value,display:'LIBELLÉ GÉNÉRÉ '+value,label:key,state,evidence:{origin:'DESCRIPTION',text:evidence,start:0,end:evidence.length}});
const fields=[field('qualification_titre','IDE',title,'REPORTED'),field('service','URGENCES',avc,'REQUIRED'),field('specialite','CARDIOLOGIE',cardio),field('service','SOINS_INTENSIFS',cardio),field('certification','DIPLOME_INFIRMIER',diploma,'REQUIRED')];
const parsed={schemaVersion:1,parserVersion:'4.0.0',inputHash:'fixture',parsedAt:'2026-09-18T00:00:00Z',fields,warnings:[],reviewQueue:[avc,cardio,diploma,avc]};
const description=[title,avc,cardio,diploma].join('\n');
const base=process.env.BASE_URL||'http://127.0.0.1:4187';
const localPreview=['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async r=>{const path=new URL(r.request().url()).pathname;let json=[];
 if(path.endsWith('/auth/me'))json={id:'fixture',email:'fixture@example.invalid',family:'NURSE',organizations:[]};
 else if(path.endsWith('/correspondence'))json={profileCorrespondence:{criteria:{service:{status:'OFFER_MISSING',reason:'SERVICE_NOT_EXPLICIT'}}}};
 else if(path.endsWith('/listings/e_parser-fixture'))json={id:'e_parser-fixture',title,description,qualification:'IDE',kind:'EXTERNAL_OFFER',active:true,source:'FRANCE_TRAVAIL',url:'https://example.invalid/source',parsedOffer:parsed};
 await r.fulfill({json});});
 await page.goto(base+'/missions/e_parser-fixture');
 const consent=page.getByRole('button',{name:'Tout refuser',exact:true});if(await consent.count())await consent.click();
 const panel=page.getByRole('region',{name:'Informations extraites de l’annonce'});await panel.waitFor({timeout:5000});
 const strong=await panel.locator('strong').allTextContents();assert.deepEqual(strong,[title,cardio,diploma]);assert.doesNotMatch(strong.join('\n'),/LIBELLÉ GÉNÉRÉ|URGENCES/);
 assert.equal(await panel.getByText(cardio,{exact:true}).count(),1);assert.equal(await panel.getByText(diploma,{exact:true}).count(),1);
 await panel.locator('summary').click();assert.equal(await panel.getByText(avc,{exact:true}).count(),1);
 await page.getByText('Lire la description intégrale',{exact:true}).click();assert.equal(await page.getByText(description,{exact:true}).textContent(),description);
 await mkdir('artifacts/parsed-offer-audit',{recursive:true});
 for(const width of [1440,375]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await panel.screenshot({path:`artifacts/parsed-offer-audit/details-${width}.png`});}
 if(localPreview){
 const preview={id:'fixture',descriptionHash:'fixture',alerts:[],missing:[],groups:[{title:'Poste',items:fields.map(f=>({label:f.label,value:String(f.value),status:'explicit',evidence:f.evidence.text}))}]};
 await page.evaluate(async preview=>{const React=await import('/node_modules/.vite/deps/react.js');const client=await import('/node_modules/.vite/deps/react-dom_client.js');const createRoot=client.createRoot||client.default.createRoot;const {ParsedOfferPreview}=await import('/src/components/ParsedOfferPreview.tsx');const div=document.createElement('div');div.id='preview-audit';document.body.append(div);createRoot(div).render((React.createElement||React.default.createElement)(ParsedOfferPreview,{offer:preview}));},preview);
 const previewNode=page.locator('#preview-audit');await previewNode.locator('strong').first().waitFor();assert.doesNotMatch(await previewNode.innerText(),/LIBELLÉ GÉNÉRÉ/);assert.equal(await previewNode.getByText(cardio,{exact:true}).count(),1);assert.equal(await previewNode.getByText(avc,{exact:true}).count(),0);assert.deepEqual(await previewNode.locator('strong').allTextContents(),[title,cardio,diploma]);await previewNode.screenshot({path:'artifacts/parsed-offer-audit/preview-375.png'});
 }
 assert.deepEqual(errors,[]);console.log('PASS Details source-only strong/dedupe/context-filter/original preservation; '+(localPreview?'Preview source-only/dedupe checked':'Preview dev-only skipped on deployed build')+'; APIs mocked only');
}finally{await browser.close()}
