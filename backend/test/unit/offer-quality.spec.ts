import { test } from "node:test";
import { expect } from "expect";
import { normalizeOffer, fetchOffers } from "../../src/public-data/offers";
import { externalPresentation } from "../../src/public-data/offer-quality";
const base = {
  id: "TEST",
  intitule: "IDE H/F",
  description: "Mission fictive",
  typeContrat: "MIS",
  lieuTravail: { libelle: "Paris", commune: "75115" },
};

test("IDE acronym and ambiguous block diploma stay distinct", () => {
  expect(normalizeOffer(base).qualification).toBe("IDE");
  for (const title of [
    "IBO H/F",
    "Infirmier de bloc opératoire H/F",
    "IADE / IBODE H/F",
  ])
    expect(
      normalizeOffer({ ...base, intitule: title }).qualification,
    ).toBeNull();
  expect(
    normalizeOffer({
      ...base,
      intitule: "Infirmier de bloc opératoire",
      description: "Diplôme d'État d'infirmier de bloc opératoire exigé",
    }).qualification,
  ).toBe("IBODE");
  expect(
    normalizeOffer({ ...base, intitule: "Infirmier anesthésiste" })
      .qualification,
  ).toBe("IADE");
});
test("provider contradictions are flagged without overwriting reported values", () => {
  const o = normalizeOffer({
    ...base,
    intitule: "IDE Paris 16ème",
    lieuTravail: { libelle: "Paris 15e Arrondissement" },
    experienceLibelle: "Débutant accepté",
    description: "Poste en CDI. Expérience professionnelle minimum de 2 ans.",
  });
  expect(o.provenance.facts.warnings).toEqual(
    expect.arrayContaining([
      "CONTRACT_TEXT_REVIEW_REQUIRED",
      "EXPERIENCE_TEXT_REVIEW_REQUIRED",
      "LOCATION_TEXT_REVIEW_REQUIRED",
    ]),
  );
  expect(o.provenance.facts.experience.label).toBe("Débutant accepté");
  expect(o.provenance.facts.contract.code).toBe("MIS");
});
test("external criteria never claim complete eligibility or a score", () => {
  const o = normalizeOffer({
    ...base,
    lieuTravail: { libelle: "Paris", latitude: 48.8, longitude: 2.3 },
    competences: [{ code: "X", libelle: "<b>Soins</b>", exigence: "E" }],
  });
  const v = externalPresentation({
    id: "e_test",
    provenance: o.provenance,
    raw_hash: "private",
  });
  expect(v.correspondence.score).toBeNull();
  expect(v.correspondence.eligibilityVerified).toBe(false);
  expect(v.correspondence.criteria.qualification.status).toBe(
    "PROVIDER_REPORTED",
  );
  expect(v.correspondence.missingForFullMatching).toContain(
    "EXACT_MISSION_DATES",
  );
  expect(v.raw_hash).toBeUndefined();
  expect(o.provenance.facts.skills[0].label).toBe("Soins");
  expect(o.provenance.facts.location.precision).toBe(
    "PROVIDER_COORDINATES_UNVERIFIED",
  );
  expect(
    normalizeOffer({ ...base, lieuTravail: { latitude: 999, longitude: 2 } })
      .provenance.facts.location.coordinates,
  ).toBeNull();
  expect(
    externalPresentation({ qualification: "IDE" }).correspondence.warnings,
  ).toContain("LEGACY_OFFER_REIMPORT_REQUIRED");
});
async function withCredentials(work: () => Promise<void>) {
  const before = [process.env.FT_CLIENT_ID, process.env.FT_CLIENT_SECRET];
  process.env.FT_CLIENT_ID = "fictional";
  process.env.FT_CLIENT_SECRET = "fictional";
  try {
    await work();
  } finally {
    for (const [i, key] of ["FT_CLIENT_ID", "FT_CLIENT_SECRET"].entries()) {
      if (before[i] === undefined) delete process.env[key];
      else process.env[key] = before[i];
    }
  }
}
test("four provider searches deduplicate and enforce the requested department", async () =>
  withCredentials(async () => {
    const keywords: string[] = [];
    const transport = (async (input: any) => {
      const url = new URL(String(input));
      if (url.pathname.includes("access_token"))
        return new Response(JSON.stringify({ access_token: "fixture" }));
      keywords.push(url.searchParams.get("motsCles")!);
      expect(url.searchParams.get("departement")).toBe("75");
      expect(url.searchParams.get("typeContrat")).toBe("MIS");
      return new Response(
        JSON.stringify({
          resultats: [
            base,
            { ...base, id: "OUTSIDE", lieuTravail: { commune: "92001" } },
          ],
        }),
      );
    }) as typeof fetch;
    const rows = await fetchOffers(2, transport, "75");
    expect(rows.map((o) => o.id)).toEqual(["TEST"]);
    expect(keywords).toEqual(["infirmier", "IDE", "IADE", "IBODE"]);
  }));
test("empty keyword does not stop subsequent searches and failure is not partial success", async () =>
  withCredentials(async () => {
    let count = 0;
    const transport = (async (input: any) => {
      if (String(input).includes("access_token"))
        return new Response(JSON.stringify({ access_token: "fixture" }));
      count++;
      if (count === 1) return new Response(null, { status: 204 });
      if (count === 4) return new Response(null, { status: 503 });
      return new Response(JSON.stringify({ resultats: [base] }));
    }) as typeof fetch;
    await expect(fetchOffers(2, transport)).rejects.toThrow("HTTP 503");
    expect(count).toBe(4);
  }));
test("invalid import bounds and department fail before network access", async () => {
  const transport = (async () => {
    throw new Error("UNEXPECTED_NETWORK");
  }) as typeof fetch;
  await expect(fetchOffers(151, transport)).rejects.toThrow("Limit");
  await expect(fetchOffers(2, transport, "75&x=1")).rejects.toThrow(
    "Invalid department",
  );
});
