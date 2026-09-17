import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge' });
const base = process.env.BASE_URL || 'http://127.0.0.1:4187';
const internal = { id: 'm_11111111-1111-4111-8111-111111111111', title: 'Mission fictive — service de médecine', qualification: 'IDE', service: 'MEDICINE', address: 'Paris, établissement fictif', start_at: '2030-09-20T06:00:00Z', end_at: '2030-09-20T18:00:00Z', hourly_salary: 28, matching_score: 87, match_explanation_id: 'explanation-fixture', publicationDate: '2030-09-17T10:00:00Z', importedAt: null };
const external = { id: 'e_22222222-2222-4222-8222-222222222222', title: 'Annonce fictive — infirmier de jour', qualification: 'IDE', location_label: 'Lyon', source: 'FRANCE_TRAVAIL', url: 'https://example.com/fictional-offer', publicationDate: null, importedAt: '2030-09-18T10:00:00Z', sourceUpdatedAt: '2030-09-18T09:00:00Z', profileCorrespondence: { knownMismatches: ['qualification'] }, provenance: { contract: 'INTERIM_CONTEXT_CONFIRMED' } };
const mixed = () => ({ mode: 'MIXED', generatedAt: '2030-09-18T11:00:00Z', internal: { status: 'READY', rppsStatus: 'FOUND', items: [internal] }, external: { status: 'READY', personalization: 'PARTIAL', items: [external], sources: [{ provider: 'FRANCE_TRAVAIL', status: 'SUCCESS', created_at: '2030-09-18T10:00:00Z' }] } });
try {
  const context = await browser.newContext(); let state = mixed(), fail = false, saved = [], writes = [], incomplete=false, searches=[], origins=[];
  await context.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname; let json = [];
    if (path.endsWith('/auth/me')) json = { id: 'fictional-nurse', email: 'fixture@example.invalid', family: 'NURSE', organizations: [] };
    else if (path.endsWith('/profile')) json = { display_name: 'Camille', qualifications: incomplete?[]:['IDE'], available: [], details: {} };
    else if (path.endsWith('/dashboards')) json = { family: 'NURSE', counts: {} };
    else if (path.endsWith('/me/recommendations')) {const origin=new URL(route.request().url()).searchParams.get('origine');origins.push(origin);const json=structuredClone(state);json.internal.personalization=incomplete?'GENERAL_PROFILE_INCOMPLETE':'COMPATIBLE';if(origin==='externes')json.internal={...json.internal,status:'HIDDEN',items:[]};if(origin==='partenaires')json.external={...json.external,status:'HIDDEN',items:[],sources:[]};return route.fulfill({ status: fail ? 503 : 200, json: fail ? { message: 'Fixture unavailable' } : json });}
    else if(path.endsWith('/listings/search')) {const request=route.request().postDataJSON();searches.push(request);const partners=Array.from({length:12},(_,i)=>({...internal,id:'m_fixture'+i,title:'Partenaire fictif '+i}));const externals=Array.from({length:25},(_,i)=>({...external,id:'e_fixture'+i,title:'Externe fictif '+i}));const all=request.origine==='partenaires'?partners:request.origine==='externes'?externals:[...partners,...externals];json={items:all.slice(request.offset,request.offset+20),total:all.length,offset:request.offset,limit:20};}
    else if(path.endsWith('/reference-data'))json={ideServices:[],blockSpecialties:[]};

    else if (path.endsWith('/auth/csrf')) json = { csrfToken: 'fixture' };
    else if (path.endsWith('/me/notification-preferences')) json = { enabled: false };
    else if (path.endsWith('/me/favorites')) {
      if (route.request().method() === 'POST') { const body = route.request().postDataJSON(); writes.push(body); saved.push({ kind: body.kind, target_id: body.targetId, title: external.title }); json = {}; }
      else json = saved;
    }
    return route.fulfill({ status: 200, json });
  });
  const page = await context.newPage(); await page.goto(base + '/accueil'); await page.getByRole('button', { name: 'Tout refuser', exact: true }).click();
  await page.getByRole('heading', { name: 'Offres partenaires InfiMatch', exact: true }).waitFor(); await page.getByRole('heading', { name: 'Offres externes à explorer', exact: true }).waitFor();
  assert.ok((await page.getByRole('link', { name: 'Voir la mission partenaire' }).getAttribute('href')).endsWith('?correspondance=explanation-fixture'));
  assert.equal(await page.getByRole('link', { name: 'Voir l’offre externe', exact: true }).getAttribute('href'), '/missions/' + external.id);
  await page.getByText('Date de publication non renseignée', { exact: false }).waitFor(); await page.getByText('Rémunération non renseignée — voir la source').waitFor();
  await page.getByRole('button', { name: 'Ajouter ' + external.title + ' aux favoris', exact: true }).click(); await page.getByRole('button', { name: 'Retirer ' + external.title + ' des favoris', exact: true }).waitFor(); assert.deepEqual(writes, [{ kind: 'EXTERNAL', targetId: external.id.slice(2) }]);
  await page.getByText('Intérim', { exact: true }).waitFor();
  await page.getByText('Critères en écart', { exact: false }).waitFor();
  await page.getByText('Mise à jour par la source le', { exact: false }).waitFor();
  assert.equal(await page.getByText('INTERIM_CONTEXT_CONFIRMED', { exact: true }).count(), 0);
  assert.notEqual(await page.getByRole('button', { name: 'Retirer ' + external.title + ' des favoris', exact: true }).evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
  fs.mkdirSync('../InfiMatch/docs/quality', { recursive: true });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `overflow ${width}`);
    await page.screenshot({ path: `../InfiMatch/docs/quality/mixed-${width}.png`, fullPage: true });
  }
  const choices=page.getByRole('group',{name:'Origine des offres'});
  await choices.getByRole('button',{name:'Partenaires',exact:true}).click();await page.getByRole('heading',{name:'Offres partenaires InfiMatch',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Offres externes à explorer',exact:true}).count(),0);assert.equal(origins.at(-1),'partenaires');
  await choices.getByRole('button',{name:'Externes',exact:true}).click();await page.getByRole('heading',{name:'Offres externes à explorer',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Offres partenaires InfiMatch',exact:true}).count(),0);assert.equal(origins.at(-1),'externes');
  incomplete=true;await choices.getByRole('button',{name:'Toutes',exact:true}).click();await page.reload();await page.getByText('Ces missions partenaires sont consultables.',{exact:false}).waitFor();await page.getByRole('link',{name:'Voir la mission partenaire',exact:true}).waitFor();
  await page.goto(base+'/missions');await page.getByRole('heading',{name:'37 offres disponibles',exact:true}).waitFor();assert.deepEqual(searches.at(-1).qualifications,[]);assert.equal(searches.at(-1).origine,'toutes');
  const titles=await page.locator('h3').allTextContents();assert.ok(titles.indexOf('Partenaire fictif 0')<titles.indexOf('Externe fictif 0'));
  await page.getByRole('button',{name:'Suivant',exact:true}).click();await page.getByRole('heading',{name:'Externe fictif 8',exact:true}).waitFor();assert.equal(searches.at(-1).offset,20);
  await page.getByRole('group',{name:'Origine des offres'}).getByRole('button',{name:'Partenaires',exact:true}).click();await page.getByRole('heading',{name:'12 offres disponibles',exact:true}).waitFor();assert.equal(searches.at(-1).offset,0);assert.equal(searches.at(-1).origine,'partenaires');assert.equal(await page.getByRole('heading',{name:'Externe fictif 0',exact:true}).count(),0);
  await page.getByRole('group',{name:'Origine des offres'}).getByRole('button',{name:'Externes',exact:true}).click();await page.getByRole('heading',{name:'25 offres disponibles',exact:true}).waitFor();assert.equal(searches.at(-1).origine,'externes');assert.equal(await page.getByRole('heading',{name:'Partenaire fictif 0',exact:true}).count(),0);
  await page.getByLabel('Intitulé, ville ou service').fill('Paris');await page.getByRole('button',{name:'Rechercher',exact:true}).click();await page.waitForTimeout(150);assert.equal(searches.at(-1).q,'Paris');assert.equal(searches.at(-1).origine,'externes');
  for(const width of [375,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:`../InfiMatch/docs/quality/origins-${width}.png`,fullPage:true});}
  incomplete=false;await page.goto(base+'/accueil?origine=toutes');await page.getByRole('heading',{name:'Offres partenaires InfiMatch',exact:true}).waitFor();
  state = mixed(); state.internal.items = []; await page.reload(); await page.getByText('Aucune mission partenaire disponible dans cette sélection.', { exact: false }).waitFor(); await page.getByRole('link', { name: 'Voir l’offre externe', exact: true }).waitFor();
  state.external.personalization = 'GENERAL_PROFILE_INCOMPLETE'; await page.reload(); await page.getByText('ces offres générales ne sont pas', { exact: false }).waitFor();
  state.internal.status = 'UNAVAILABLE'; state.external.sources[0].status = 'FAILED'; await page.reload(); await page.getByText('La recherche de missions compatibles est temporairement indisponible.').waitFor(); await page.getByText('La dernière actualisation', { exact: false }).waitFor(); await page.getByRole('heading', { name: 'Votre prochaine mission' }).waitFor(); await page.getByRole('link', { name: 'Voir l’offre externe', exact: true }).waitFor();
  fail = true; await page.reload(); await page.getByRole('button', { name: 'Réessayer les suggestions' }).waitFor(); await page.getByRole('heading', { name: 'Votre prochaine mission' }).waitFor();
  fail = false; state = mixed(); await page.getByRole('button', { name: 'Réessayer les suggestions' }).click(); await page.getByRole('link', { name: 'Voir la mission partenaire' }).waitFor();
  console.log('PASS mixed groups, empty/internal retained external, incomplete/general, partial/source failure, complete retry isolated from dashboard, missing dates/salary, detail links, external favorites, 375/768/1440 no overflow.');
} finally { await browser.close(); }
