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
