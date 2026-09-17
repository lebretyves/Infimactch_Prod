import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = process.env.BASE_URL || "http://127.0.0.1:4193";
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    timezoneId: "America/Los_Angeles",
  });
  let confirmed = true,
    bank = false,
    enterprise = false;
  const writes = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const internal = {
    id: "m_fixture",
    title: "Infirmier en service de médecine",
    qualification: "IDE",
    service: "MEDICINE",
    address: "Paris · Île-de-France",
    hourly_salary: 27,
    start_at: "2030-09-18T06:00:00Z",
    end_at: "2030-09-18T18:00:00Z",
  };
  const external = {
    id: "e_fixture",
    title: "Infirmier de nuit — clinique",
    qualification: "IDE",
    address: "Paris",
    source: "FRANCE_TRAVAIL",
    publicationDate: "2030-09-15T10:00:00Z",
    profileCorrespondence: { knownMismatches: [] },
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let json = [];
    if (!["GET", "HEAD"].includes(route.request().method())) writes.push(path);
    if (path.endsWith("/auth/me"))
      json = {
        id: "fixture-home",
        email: "fixture@example.invalid",
        family: enterprise ? "FACILITY" : "NURSE",
        organizations: enterprise
          ? [
              {
                id: "fixture-org",
                name: "Établissement fictif",
                kind: "FACILITY",
              },
            ]
          : [],
      };
    else if (path.endsWith("/profile"))
      json = {
        display_name: "Camille",
        qualifications: ["IDE"],
        available: [
          { start: "2030-09-17T22:00:00Z", end: "2030-09-18T06:00:00Z" },
          { start: "2030-09-18T12:00:00Z", end: "2030-09-18T16:00:00Z" },
          { start: "2030-09-18T17:00:00Z", end: "2030-09-18T19:00:00Z" },
          { start: "2030-09-20T22:00:00Z", end: "2030-09-23T22:00:00Z" },
        ],
        details: { mobilityCity: "Paris (75001)" },
        radius_km: 25,
      };
    else if (path.endsWith("/dashboards"))
      json = {
        family: enterprise ? "FACILITY" : "NURSE",
        counts: { OPEN: 2 },
        activity: { needs: 3, applications: 4 },
      };
    else if (path.endsWith("/me/history")) json = confirmed ? [
      {id:'later',mission_id:'later',title:'Mission tardive',status:'ACTIVE',start_at:'2030-09-25T06:00:00Z',end_at:'2030-09-25T14:00:00Z'},
      {id:'cancelled',mission_id:'cancelled',title:'Mission annulée',status:'CANCELLED',start_at:'2030-09-17T06:00:00Z',end_at:'2030-09-17T14:00:00Z'},
      {id:'past',mission_id:'past',title:'Mission passée',status:'ACTIVE',start_at:'2020-09-17T06:00:00Z',end_at:'2020-09-17T14:00:00Z'},
      {id:'selected',mission_id:'selected',title:'Candidature sélectionnée',status:'SELECTED',start_at:'2030-09-17T06:00:00Z',end_at:'2030-09-17T14:00:00Z'},
      {id:'dom',mission_id:'dom',title:'Soins infirmiers en Martinique',status:'ACTIVE',timezone:'America/Martinique',start_at:'2030-09-18T14:00:00Z',end_at:'2030-09-18T22:00:00Z',address:'12 rue de démonstration, Fort-de-France',establishment_name:'Établissement fictif Antilles'},
      {id:'night',mission_id:'night',title:'Mission de nuit',status:'ACTIVE',timezone:'Europe/Paris',start_at:'2030-09-19T18:00:00Z',end_at:'2030-09-20T06:00:00Z',address:'20 rue fictive, Paris'},
      {id:'third',mission_id:'third',title:'Troisième mission',status:'ACTIVE',start_at:'2030-09-21T06:00:00Z',end_at:'2030-09-21T14:00:00Z'}
    ] : [];
    else if (path.endsWith("/me/applications"))
      json = [{ id: "application", status: "SUBMITTED" }];
    else if (path.endsWith("/me/recommendations"))
      json = {
        internal: {
          status: "READY",
          personalization: "COMPATIBLE",
          items: [internal],
        },
        external: {
          status: "READY",
          personalization: "PARTIAL",
          items: [external],
          sources: [{ provider: "FRANCE_TRAVAIL", status: "SUCCESS" }],
        },
      };
    else if (path.endsWith("/me/notifications")) json=[{id:"notice-fixture",kind:"MISSION",title:"Mission entreprise",href:"/missions",read_at:null}];
    else if (path.endsWith("/me/bank-details"))
      json = { required: bank, iban: null, document: null };
    else if (path.endsWith("/me/notification-preferences"))
      json = { enabled: false };
    await route.fulfill({ status: 200, json });
  });
  await page.goto(base + "/accueil");
  const consent=page.getByRole('button',{name:'Tout refuser',exact:true});if(await consent.count())await consent.click();
  const card=page.getByRole('region',{name:'Missions à venir',exact:true});await card.waitFor();
  assert.equal(await card.locator('li').count(),3);
  assert.match(await card.locator('li').first().innerText(),/Martinique/);
  assert.match(await card.locator('li').first().innerText(),/10:00 – 18:00/);
  assert.match(await card.innerText(),/Fort-de-France/);
  assert.doesNotMatch(await card.innerText(),/Mission annulée|Mission passée|Candidature sélectionnée|Mission tardive/);
  assert.match(await card.locator('li').nth(1).innerText(),/20:00 – 20 sept.*08:00/);
  assert.equal(await card.getByRole('link',{name:'Voir la mission : Soins infirmiers en Martinique'}).getAttribute('href'),'/missions/m_dom');
  assert.equal(await page.getByRole('heading',{name:'Votre prochaine mission',exact:true}).count(),0);
  assert.equal(await page.getByRole('heading',{name:'Notifications de mission',exact:true}).count(),0);
  await mkdir('artifacts/upcoming-missions',{recursive:true});
  for(const width of [1440,375]){await page.setViewportSize({width,height:1100});await card.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await card.screenshot({path:`artifacts/upcoming-missions/upcoming-${width}.png`});await page.screenshot({path:`artifacts/upcoming-missions/home-${width}.png`,fullPage:true});}
  confirmed=false;await page.reload();await card.waitFor();assert.match(await card.innerText(),/Aucune mission confirmée/);
  enterprise=true;await page.reload();await page.getByRole('heading',{name:'Notifications récentes',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Marquer comme lue',exact:true}).count(),0);
  assert.equal(await page.getByRole('link',{name:'Consulter les missions',exact:true}).last().getAttribute('href'),'/missions?notification=notice-fixture');
  assert.deepEqual(writes.filter(path=>!path.endsWith('/auth/activity')),[]);assert.deepEqual(errors,[]);console.log('PASS upcoming sort/3max/status/date/DOM/location/link/empty/enterprise notifications/375+1440');
} finally {await browser.close();}
