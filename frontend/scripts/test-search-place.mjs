import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = process.env.BASE_URL || "http://127.0.0.1:4193";
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const searches = [],
    writes = [],
    errors = [],
    locations = [];
  let fail = false;
  let hasHome = true;
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    let json = [];
    if (path.endsWith("/auth/me"))
      json = {
        id: "fixture-nurse",
        email: "fixture@example.invalid",
        family: "NURSE",
        organizations: [],
      };
    else if (path.endsWith("/profile")) {
      if (route.request().method() !== "GET") writes.push(path);
      json = {
        display_name: "Test fictif",
        qualifications: ["IDE", "IADE", "IBODE"],
        available: [
          { start: "2026-09-20T00:00:00Z", end: "2026-12-20T00:00:00Z" },
        ],
        latitude: hasHome ? 48.8566 : null,
        longitude: hasHome ? 2.3522 : null,
        details: { city: "Paris", mobilityCity: "Paris (75001)" },
      };
    } else if (path.endsWith("/reference-data"))
      json = { ideServices: ["REA"], blockSpecialties: ["CARDIAC"] };
    else if (path.endsWith("/auth/csrf")) json = { csrfToken: "fixture" };
    else if (path.endsWith("/listings/locations")) {
      const q = url.searchParams.get("q");
      locations.push(q);
      if (q === "Ancienne") await new Promise((r) => setTimeout(r, 700));
      if (fail)
        return route.fulfill({ status: 503, json: { message: "Unavailable" } });
      json = {
        provider: "IGN",
        items: [
          {
            label: q === "Ancienne" ? "Ancienne réponse" : "Lyon (69001)",
            latitude: 45.764,
            longitude: 4.8357,
          },
        ],
      };
    } else if (path.endsWith("/listings/search")) {
      const body = route.request().postDataJSON();
      searches.push(body);
      json = {
        items: Array.from(
          { length: Math.min(20, 25 - body.offset) },
          (_, i) => ({
            id: "m_fixture" + (body.offset + i),
            title:
              i % 2
                ? "Infirmier en réanimation — journée"
                : "Mission infirmière en clinique",
            qualification: "IDE",
            address: "Lyon · Auvergne-Rhône-Alpes",
            hourly_salary: 25,
            publicationDate: "2026-09-17T12:00:00Z",
            distanceKm: 8,
            matching_score: body.sort === "relevance" ? 82 : null,
          }),
        ),
        total: 25,
        offset: body.offset,
        limit: 20,
      };
    }
    await route.fulfill({ status: 200, json });
  });
  await page.goto(base + "/missions");
  await page.getByRole("button", { name: "Tout refuser", exact: true }).click();
  await page
    .getByRole("heading", { name: "25 offres disponibles", exact: true })
    .waitFor();
  assert.equal(await page.locator("details[open]").count(), 0);
  assert.equal(searches.at(-1).sort, "recent");
  const place = page.getByRole("combobox", { name: "Où ?", exact: true }),
    radius = page.getByLabel("Rayon", { exact: true });
  async function apply() {
    const count = searches.length;
    await page.getByRole("button", { name: "Rechercher", exact: true }).click();
    await page.waitForTimeout(250);
    assert.ok(searches.length > count);
  }
  await place.fill("Lyon");
  await page
    .getByRole("option", { name: "Lyon (69001)", exact: true })
    .waitFor();
  await place.press("ArrowDown");
  await place.press("Enter");
  assert.equal(await radius.inputValue(), "25");
  await apply();
  assert.equal(searches.at(-1).latitude, 45.764);
  assert.equal(searches.at(-1).radiusKm, 25);
  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await page.waitForTimeout(200);
  assert.equal(searches.at(-1).offset, 20);
  await page.getByLabel("Trier par", { exact: true }).selectOption("distance");
  await page.waitForTimeout(200);
  assert.equal(searches.at(-1).offset, 0);
  assert.equal(searches.at(-1).sort, "distance");
  assert.equal(searches.at(-1).latitude, 45.764);
  await radius.selectOption("");
  await apply();
  assert.equal(searches.at(-1).radiusKm, undefined);
  assert.equal(searches.at(-1).latitude, 45.764);
  await page.locator("summary").filter({ hasText: "Autres critères" }).click();
  await page
    .getByLabel("Date de publication", { exact: true })
    .selectOption("7");
  await page.locator("summary").filter({ hasText: "Disponibilités" }).click();
  await page.getByLabel("Compatibles avec mes disponibilités").check();
  await apply();
  assert.equal(searches.at(-1).publishedWithinDays, 7);
  assert.equal(searches.at(-1).availableOnly, true);
  await page
    .getByRole("button", {
      name: "Retirer le filtre 7 derniers jours",
      exact: true,
    })
    .click();
  await page.waitForTimeout(200);
  assert.equal(searches.at(-1).publishedWithinDays, undefined);
  assert.equal(searches.at(-1).availableOnly, true);
  await page.reload();
  await page
    .getByRole("heading", { name: "25 offres disponibles", exact: true })
    .waitFor();
  assert.equal(searches.at(-1).sort, "distance");
  assert.equal(searches.at(-1).availableOnly, true);
  await place.fill("Lyon modifiée");
  const count = searches.length;
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  assert.equal(searches.length, count);
  await page.getByRole("alert").waitFor();
  await page
    .getByRole("button", { name: "Utiliser ma zone de mobilité", exact: true })
    .click();
  await apply();
  assert.equal(searches.at(-1).latitude, 48.8566);
  fail = true;
  await place.fill("Erreur");
  await page.getByText("Recherche de lieux indisponible.").waitFor();
  fail = false;
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await page.getByRole("option", { name: "Lyon (69001)" }).waitFor();
  await place.fill("Ancienne");
  await page.waitForTimeout(400);
  await place.fill("Lyon");
  await page.waitForTimeout(1000);
  assert.equal(
    await page.getByRole("option", { name: "Ancienne réponse" }).count(),
    0,
  );
  await place.press("ArrowDown");
  await place.press("Enter");
  await apply();
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .click();
  await page.waitForTimeout(200);
  assert.equal(searches.at(-1).availableOnly, undefined);
  await page.getByLabel("Trier par", { exact: true }).selectOption("recent");
  await page.waitForTimeout(200);
  await mkdir("artifacts/offers-redesign", { recursive: true });
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await page.screenshot({
      path: `artifacts/offers-redesign/search-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.locator("summary").filter({ hasText: "Métier" }).click();
  await page.getByLabel("Qualification", { exact: true }).selectOption("IDE");
  assert.equal(await page.getByLabel("Population", { exact: true }).count(), 0);
  assert.equal(await page.getByLabel("Bloc", { exact: true }).count(), 0);
  await page.screenshot({
    path: "artifacts/offers-redesign/search-expanded.png",
    fullPage: true,
  });
  await page.goto(base + "/missions?vue=recommandees&published=30");
  await page
    .getByRole("heading", { name: "25 offres disponibles", exact: true })
    .waitFor();
  assert.equal(searches.at(-1).sort, "relevance");
  assert.equal(searches.at(-1).publishedWithinDays, 30);
  assert.equal(searches.at(-1).origine, "partenaires");
  hasHome = false;
  await page.goto(
    base + "/missions?sort=distance&place=Lyon&lat=45.764&lon=4.8357",
  );
  await page
    .getByRole("heading", { name: "25 offres disponibles", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Retirer le filtre Lyon", exact: true })
    .click();
  await page.waitForTimeout(200);
  assert.equal(searches.at(-1).sort, "recent");
  assert.equal(searches.at(-1).latitude, undefined);
  await page.goto(
    base + "/missions?sort=distance&place=Lyon&lat=45.764&lon=4.8357",
  );
  await page
    .getByRole("heading", { name: "25 offres disponibles", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .click();
  await page.waitForTimeout(200);
  assert.equal(searches.at(-1).sort, "recent");
  await page.goto(
    base + "/missions?qualification=IADE&block=SPECIALIZED&specialty=CARDIAC",
  );
  await page
    .getByRole("heading", { name: "25 offres disponibles", exact: true })
    .waitFor();
  assert.equal(searches.at(-1).iadeSpecialties[0], "CARDIAC");
  await page
    .getByRole("button", { name: /Retirer le filtre.*Cardiac/i })
    .click();
  await page.waitForTimeout(200);
  assert.equal(searches.at(-1).iadeSpecialties, undefined);
  assert.equal(writes.length, 0);
  assert.deepEqual(errors, []);
  assert.ok(locations.length > 3);
  console.log(
    "PASS: autocomplete keyboard, cancellation/retry, explicit selection, no profile writes, global sort/filter payload, page reset, URL/reload, legacy recommendations, contextual métier fields, removable filters, mobile375 and desktop1440.",
  );
} finally {
  await browser.close();
}
