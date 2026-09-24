import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const browser = await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
const base = process.env.BASE_URL || "http://127.0.0.1:4187";
const internal = {
  id: "m_11111111-1111-4111-8111-111111111111",
  title: "Mission fictive — service de médecine",
  qualification: "IDE",
  service: "MEDICINE",
  address: "Paris, établissement fictif",
  start_at: "2030-09-20T06:00:00Z",
  end_at: "2030-09-20T18:00:00Z",
  hourly_salary: 28,
  matching_score: 87,
  match_explanation_id: "explanation-fixture",
  publicationDate: "2030-09-17T10:00:00Z",
  importedAt: null,
};
const external = {
  id: "e_22222222-2222-4222-8222-222222222222",
  title: "Annonce fictive — infirmier de jour",
  qualification: "IDE",
  location_label: "Lyon",
  source: "FRANCE_TRAVAIL",
  url: "https://example.com/fictional-offer",
  publicationDate: null,
  importedAt: "2030-09-18T10:00:00Z",
  sourceUpdatedAt: "2030-09-18T09:00:00Z",
  profileCorrespondence: { knownMismatches: ["qualification"] },
  provenance: { contract: "INTERIM_CONTEXT_CONFIRMED" },
};
const mixed = () => ({
  mode: "MIXED",
  generatedAt: "2030-09-18T11:00:00Z",
  externalCatalogueVisible: true,
  internal: { status: "READY", rppsStatus: "FOUND", items: [internal] },
  external: {
    status: "READY",
    personalization: "PARTIAL",
    items: [external],
    sources: [
      {
        provider: "FRANCE_TRAVAIL",
        status: "SUCCESS",
        created_at: "2030-09-18T10:00:00Z",
      },
    ],
  },
});
try {
  const context = await browser.newContext();
  let state = mixed(),
    fail = false,
    saved = [],
    writes = [],
    incomplete = false,
    searches = [],
    origins = [];
  await context.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    let json = [];
    if (path.endsWith("/auth/me"))
      json = {
        id: "fictional-nurse",
        email: "fixture@example.invalid",
        family: "NURSE",
        organizations: [],
      };
    else if (path.endsWith("/profile"))
      json = {
        display_name: "Camille",
        qualifications: incomplete ? [] : ["IDE"],
        available: [],
        details: {},
      };
    else if (path.endsWith("/dashboards"))
      json = { family: "NURSE", counts: {} };
    else if (path.endsWith("/me/recommendations")) {
      const origin = new URL(route.request().url()).searchParams.get("origine");
      origins.push(origin);
      const json = structuredClone(state);
      json.internal.personalization = incomplete
        ? "GENERAL_PROFILE_INCOMPLETE"
        : "COMPATIBLE";
      if (origin === "externes")
        json.internal = { ...json.internal, status: "HIDDEN", items: [] };
      if (origin === "partenaires")
        json.external = {
          ...json.external,
          status: "HIDDEN",
          items: [],
          sources: [],
        };
      return route.fulfill({
        status: fail ? 503 : 200,
        json: fail ? { message: "Fixture unavailable" } : json,
      });
    } else if (path.endsWith("/listings/search")) {
      const request = route.request().postDataJSON();
      searches.push(request);
      const partners = Array.from({ length: 12 }, (_, i) => ({
        ...internal,
        id: "m_fixture" + i,
        title: "Partenaire fictif " + i,
      }));
      const externals = Array.from({ length: 25 }, (_, i) => ({
        ...external,
        id: "e_fixture" + i,
        title: "Externe fictif " + i,
      }));
      const all =
        request.origine === "partenaires"
          ? partners
          : request.origine === "externes"
            ? externals
            : [...partners, ...externals];
      json = {
        items: all.slice(request.offset, request.offset + 20),
        total: all.length,
        offset: request.offset,
        limit: 20,
      };
    } else if (path.endsWith("/matching/rules")) json={weights:{C:.45,Z:.25,D:.2,E:.1}};
    else if (path.endsWith("/reference-data"))
      json = { ideServices: [], blockSpecialties: [] };
    else if (path.endsWith("/auth/csrf")) json = { csrfToken: "fixture" };
    else if (path.endsWith("/me/notification-preferences"))
      json = { enabled: false };
    else if (path.endsWith("/me/favorites")) {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        writes.push(body);
        saved.push({
          kind: body.kind,
          target_id: body.targetId,
          title: external.title,
        });
        json = {};
      } else json = saved;
    }
    return route.fulfill({ status: 200, json });
  });
  const page = await context.newPage();
  await page.goto(base + "/accueil?origine=toutes");
  await page.getByRole("button", {name:"Tout refuser",exact:true}).click();
  const matches=page.getByRole("region",{name:"Vos matchs",exact:true});
  const choices=matches.getByRole("group",{name:"Origine des offres"});
  const partnerCard=matches.getByRole("listitem").filter({has:page.getByRole("heading",{name:internal.title,exact:true})});
  const externalCard=matches.getByRole("listitem").filter({has:page.getByRole("heading",{name:external.title,exact:true})});
  await partnerCard.waitFor();
  assert.equal(origins.at(-1),'partenaires');
  assert.deepEqual(await choices.getByRole('button').allTextContents(),['Partenaires','Externes']);
  assert.equal(await matches.getByRole('listitem').count(),1);
  assert.match(await partnerCard.innerText(),/87\s*%/);
  assert.ok((await matches.getByRole('link',{name:'Voir la mission',exact:true}).getAttribute('href')).endsWith('?correspondance=explanation-fixture'));
  await choices.getByRole('button',{name:'Externes',exact:true}).click();await externalCard.waitFor();
  assert.equal(origins.at(-1),'externes');assert.equal(await partnerCard.count(),0);
  assert.match(await externalCard.innerText(),/France Travail/);assert.match(await externalCard.innerText(),/Correspondance partielle/);assert.doesNotMatch(await externalCard.innerText(),/\d+\s*%/);
  assert.equal(await matches.getByRole('link',{name:'Voir l’offre',exact:true}).getAttribute('href'),'/missions/'+external.id);
  await matches.getByText('Date de publication non renseignée',{exact:false}).waitFor();
  await matches.getByText('Rémunération non renseignée — voir la source').waitFor();
  await matches.getByRole('button',{name:'Ajouter '+external.title+' aux favoris',exact:true}).click();
  await matches.getByRole('button',{name:'Retirer '+external.title+' des favoris',exact:true}).waitFor();
  assert.deepEqual(writes,[{kind:'EXTERNAL',targetId:external.id.slice(2)}]);
  await matches.getByText('Intérim',{exact:true}).waitFor();await matches.getByText('Critères en écart',{exact:false}).waitFor();
  await matches.locator('summary').filter({hasText:'Actualisation de l’annonce'}).click();
  await matches.getByText('Mise à jour par la source le',{exact:false}).waitFor();
  assert.equal(await matches.getByText('INTERIM_CONTEXT_CONFIRMED',{exact:true}).count(),0);
  fs.mkdirSync('artifacts/browser-checks',{recursive:true});
  for(const width of [375,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
  incomplete=true;await choices.getByRole('button',{name:'Partenaires',exact:true}).click();
  await matches.getByText('Ces missions partenaires sont consultables.',{exact:false}).waitFor();
  assert.match(await partnerCard.innerText(),/Matching non calculable/);assert.doesNotMatch(await partnerCard.innerText(),/87\s*%/);
  await page.goto(base + "/missions");
  await page
    .getByRole("heading", { name: "37 offres disponibles", exact: true })
    .waitFor();
  assert.deepEqual(searches.at(-1).qualifications, []);
  assert.equal(searches.at(-1).origine, "toutes");
  const titles = await page.locator("h3").allTextContents();
  assert.ok(
    titles.indexOf("Partenaire fictif 0") < titles.indexOf("Externe fictif 0"),
  );
  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await page
    .getByRole("heading", { name: "Externe fictif 8", exact: true })
    .waitFor();
  assert.equal(searches.at(-1).offset, 20);
  await page
    .getByRole("group", { name: "Origine des offres" })
    .getByRole("button", { name: "Partenaires", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "12 offres disponibles", exact: true })
    .waitFor();
  assert.equal(searches.at(-1).offset, 0);
  assert.equal(searches.at(-1).origine, "partenaires");
  assert.equal(
    await page
      .getByRole("heading", { name: "Externe fictif 0", exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("group", { name: "Origine des offres" })
    .getByRole("button", { name: "Externes", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "25 offres disponibles", exact: true })
    .waitFor();
  assert.equal(searches.at(-1).origine, "externes");
  assert.equal(
    await page
      .getByRole("heading", { name: "Partenaire fictif 0", exact: true })
      .count(),
    0,
  );
  await page.getByLabel("Quel poste ?").fill("Paris");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await page.waitForTimeout(150);
  assert.equal(searches.at(-1).q, "Paris");
  assert.equal(searches.at(-1).origine, "externes");
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await page.screenshot({
      path: `artifacts/browser-checks/origins-${width}.png`,
      fullPage: true,
    });
  }
  incomplete=false;state=mixed();state.internal.items=[];
  await page.goto(base+'/accueil');
  await matches.getByText('Aucune mission partenaire disponible dans cette sélection.',{exact:false}).waitFor();
  assert.equal(await externalCard.count(),0);
  await choices.getByRole('button',{name:'Externes',exact:true}).click();await externalCard.waitFor();
  state.external.personalization='GENERAL_PROFILE_INCOMPLETE';state.external.sources[0].status='FAILED';await page.reload();
  await matches.getByText('ces offres externes générales ne sont pas',{exact:false}).waitFor();await matches.getByText('La dernière actualisation',{exact:false}).waitFor();
  state.internal.status='UNAVAILABLE';await choices.getByRole('button',{name:'Partenaires',exact:true}).click();
  await matches.getByText('La recherche de missions compatibles est temporairement indisponible.').waitFor();
  assert.equal(await matches.getByText('Aucune offre ne correspond à cette sélection pour le moment.').count(),0);
  await page.getByRole('heading',{name:'Vos disponibilités'}).waitFor();
  fail=true;await page.reload();await matches.getByRole('button',{name:'Réessayer les suggestions'}).waitFor();
  fail=false;state=mixed();await matches.getByRole('button',{name:'Réessayer les suggestions'}).click();await partnerCard.waitFor();
  state.externalCatalogueVisible=false;state.external.status='HIDDEN';state.external.items=[];
  await page.goto(base+'/accueil?origine=externes');await partnerCard.waitFor();
  assert.equal(origins.at(-1),'partenaires');assert.deepEqual(await choices.getByRole('button').allTextContents(),['Partenaires']);
  console.log('PASS partner default, no All filter in matches, external selection/favorites, hidden source fallback, incomplete profiles, outage distinct from empty, search All preserved, responsive.');
}finally{await browser.close();}
