import { test } from "node:test";
import { expect } from "expect";
import { normalizeOffer, fetchOffers } from "../../src/public-data/offers";
const raw = {
  id: "FICTION1",
  intitule: "  Infirmier   H/F  ",
  description: "<p> Mission   fictive </p>",
  typeContrat: "MIS",
  lieuTravail: { libelle: "Paris" },
};
test("public offer cleanup retains provenance and no invented dates", () => {
  const o = normalizeOffer(raw);
  expect(o.title).toBe("Infirmier H/F");
  expect(o.description).toBe("Mission fictive");
  expect(o.qualification).toBe("IDE");
  expect(o.provenance.missionStart).toBe(null);
});
test("permanent contract rejected from interim import", () =>
  expect(() => normalizeOffer({ ...raw, typeContrat: "CDI" })).toThrow());
test("unknown qualification stays unknown", () =>
  expect(
    normalizeOffer({ ...raw, intitule: "Professionnel polyvalent" })
      .qualification,
  ).toBe(null));
test("IBODE does not become IADE", () =>
  expect(normalizeOffer({ ...raw, intitule: "IBODE H/F" }).qualification).toBe(
    "IBODE",
  ));
test("missing provider access cannot report an acquisition", async () => {
  const a = process.env.FT_CLIENT_ID,
    b = process.env.FT_CLIENT_SECRET;
  delete process.env.FT_CLIENT_ID;
  delete process.env.FT_CLIENT_SECRET;
  try {
    await expect(fetchOffers()).rejects.toThrow("credentials missing");
  } finally {
    if (a) process.env.FT_CLIENT_ID = a;
    if (b) process.env.FT_CLIENT_SECRET = b;
  }
});

test("provider ISO dates are normalized to UTC without changing their instant", () => {
  const o = normalizeOffer({...raw,dateCreation:"2026-09-19T09:30:00+02:00",dateActualisation:"2026-09-19T08:15:25Z"});
  expect(o.provenance.publishedAt).toBe("2026-09-19T07:30:00.000Z");
  expect(o.provenance.sourceUpdatedAt).toBe("2026-09-19T08:15:25.000Z");
  expect(o.provenance.normalizationVersion).toBe(3);
});
test("invalid or missing provider dates become null without rejecting the offer", () => {
  for (const value of [undefined,null,123,{},[],"","pas une date","2026-02-30T12:00:00Z","19/09/2026"]) {
    const o = normalizeOffer({...raw,dateCreation:value,dateActualisation:value});
    expect(o.provenance.publishedAt).toBe(null);
    expect(o.provenance.sourceUpdatedAt).toBe(null);
  }
});
test("ISO dates without offset use UTC rather than the machine timezone", () => {
  const o = normalizeOffer({...raw,dateCreation:"2026-09-19",dateActualisation:"2026-09-19T09:30:00"});
  expect(o.provenance.publishedAt).toBe("2026-09-19T00:00:00.000Z");
  expect(o.provenance.sourceUpdatedAt).toBe("2026-09-19T09:30:00.000Z");
});
