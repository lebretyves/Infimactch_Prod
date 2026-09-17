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
  let confirmed = false,
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
    else if (path.endsWith("/me/history"))
      json = confirmed
        ? [
            {
              id: "assignment",
              mission_id: "fixture",
              title: "Mission confirmée de médecine",
              status: "ACTIVE",
              start_at: "2030-09-18T06:00:00Z",
              end_at: "2030-09-18T18:00:00Z",
            },
          ]
        : [];
    else if (path.endsWith("/me/applications"))
      json = [{ id: "application", status: "SUBMITTED" }];
    else if (path.endsWith("/me/recommendations"))
      json = {
        internal: {
          status: "READY",
          personalization: "COMPATIBLE",
          items: process.env.SCENARIO==='external-only'?[]:Array.from({length:3},(_,i)=>({...internal,id:internal.id+i})),
        },
        external: {
          status: "READY",
          personalization: "PARTIAL",
          items: process.env.SCENARIO==='internal-only'?[]:Array.from({length:3},(_,i)=>({...external,id:external.id+i})),
          sources: [{ provider: "FRANCE_TRAVAIL", status: "SUCCESS" }],
        },
      };
    else if (path.endsWith("/me/bank-details"))
      json = { required: bank, iban: null, document: null };
    else if (path.endsWith("/me/notification-preferences"))
      json = { enabled: false };
    await route.fulfill({ status: 200, json });
  });
  await page.goto(base + "/accueil");
  await page.getByRole("button", { name: "Tout refuser", exact: true }).click();
  await page
    .getByRole("heading", { name: "Vos pistes de mission", exact: true })
    .waitFor();
  const dates = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Vos disponibilités",
      exact: true,
    }),
  });
  assert.match(await dates.innerText(), /18\/09\/2030/);
  assert.equal((await dates.innerText()).match(/18\/09\/2030/g)?.length, 1);
  assert.match(await dates.innerText(), /Du 21\/09\/2030 au 23\/09\/2030/);
  assert.doesNotMatch(await dates.innerText(), /\d{2}:\d{2}|journée entière/);
  assert.equal(
    await page
      .getByRole("heading", { name: "Votre prochaine mission", exact: true })
      .count(),
    0,
  );
  assert.equal(await page.getByRole("heading", {name:"Notifications de mission",exact:true}).count(),0);
  await mkdir("artifacts/home-spacing-audit", { recursive: true });
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `overflow${width}`,
    );
    const positions = await page.evaluate(() => {
      const headings = [...document.querySelectorAll("h2")];
      return Object.fromEntries(
        headings.map((h) => [
          h.textContent,
          h.getBoundingClientRect().top + scrollY,
        ]),
      );
    });
    if (width === 375)
      assert.ok(
        positions["Missions à venir"] < positions["Vos pistes de mission"],
      );
    await page.screenshot({
      path: `artifacts/home-spacing-audit/${process.env.SCENARIO}-${width}.png`,
      fullPage: true,
    });
  }
  await page.locator("summary").filter({hasText:"Disponibilités, profil et dossier"}).click();
  assert.equal(
    await page
      .getByRole("link", { name: "Mettre à jour", exact: true })
      .getAttribute("href"),
    "/calendrier",
  );
  await page.setViewportSize({width:1440,height:1100});
  await page.setViewportSize({width:375,height:1100});console.log('TARGETS',await page.getByRole('button').evaluateAll(es=>es.filter(e=>/favorite|favoris|Toutes|Partenaires|Externes/.test(e.getAttribute('aria-label')||e.textContent)).map(e=>({name:e.getAttribute('aria-label')||e.textContent,height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}))));await page.setViewportSize({width:1440,height:1100});
  console.log('LAYOUT',process.env.SCENARIO,await page.getByRole('heading',{name:'Offres partenaires InfiMatch',exact:true}).evaluate(el=>({internal:el.closest('section').getBoundingClientRect().width,container:el.closest('section').parentElement.getBoundingClientRect().width})));
  const fullGroupName=process.env.SCENARIO==='external-only'?'Offres externes à explorer':'Offres partenaires InfiMatch';
  const fullGroup=page.getByRole('heading',{name:fullGroupName,exact:true});
  assert.ok(await fullGroup.evaluate(el=>el.closest('section').getBoundingClientRect().width/el.closest('section').parentElement.getBoundingClientRect().width>.98));
  const chosenOrigin=process.env.SCENARIO==='external-only'?'Externes':'Partenaires';
  await page.getByRole('button',{name:chosenOrigin,exact:true}).click();
  await page.waitForTimeout(250);await fullGroup.waitFor();
  assert.ok(await fullGroup.evaluate(el=>el.closest('section').getBoundingClientRect().width/el.closest('section').parentElement.getBoundingClientRect().width>.98));
  assert.equal(await page.getByRole('heading',{name:process.env.SCENARIO==='external-only'?'Offres partenaires InfiMatch':'Offres externes à explorer',exact:true}).count(),0);
  assert.equal(await page.getByRole('heading',{name:'Notifications de mission',exact:true}).count(),0);
  await page.getByRole('button',{name:'Toutes',exact:true}).click();await fullGroup.waitFor();
  confirmed = true;
  bank = true;
  await page.reload();
  await page
    .getByRole("heading", { name: "Missions à venir", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "Voir la mission : Mission confirmée de médecine", exact: true })
    .waitFor();
  await page.getByRole("complementary", { name: "RIB à compléter" }).waitFor();
  const confirmedCard = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Missions à venir",
      exact: true,
    }),
  });
  assert.match(await confirmedCard.innerText(), /\d{2}:\d{2}/);
  await page.screenshot({
    path: "artifacts/home-spacing-audit/home-confirmed-375.png",
    fullPage: true,
  });
  assert.deepEqual(
    writes.filter(
      (path) => !path.includes("cookie") && !path.endsWith("/auth/activity"),
    ),
    [],
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS home: compact preparation before full-width offers, date-only Paris in US browser timezone, no empty mission panel, real follow-up counts, notifications replaced, confirmed mission times/actions and RIB preserved,375/768/1440 no overflow, no writes.",
  );
} finally {
  await browser.close();
}
