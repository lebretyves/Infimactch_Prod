import { test } from "node:test";
import { expect } from "expect";
import {
  FINESS_PATTERN,
  finessCoordinates,
  normalizeFiness,
} from "../../src/reference-data/finess";
test("FINESS retains leading zero and Corsican identifiers", () => {
  expect(FINESS_PATTERN.test("010000001")).toBe(true);
  expect(FINESS_PATTERN.test("2A0000001")).toBe(true);
  expect(FINESS_PATTERN.test("2B0000001")).toBe(true);
  expect(FINESS_PATTERN.test("2C0000001")).toBe(false);
});
test("FINESS selects degree coordinates instead of projected XY", () => {
  expect(
    finessCoordinates({
      coordonneeX: "872835.21",
      coordonneeY: "6569568.1",
      directionLongitude: "5.241822",
      directionLatitude: "46.203876",
    }),
  ).toEqual({
    longitude: 5.241822,
    latitude: 46.203876,
    coordinate_source: "SOURCE_DIRECTION_DEGREES",
  });
});
test("FINESS refuses ambiguous pairs and retains unknown coordinates", () => {
  expect(
    finessCoordinates({
      coordonneeX: "2",
      coordonneeY: "48",
      directionLongitude: "3",
      directionLatitude: "47",
    }),
  ).toBe(null);
  expect(
    finessCoordinates({ coordonneeX: "872835", coordonneeY: "6569568" }),
  ).toBe(null);
  expect(finessCoordinates({ coordonneeX: "", coordonneeY: "" })).toBe(null);
});
test("FINESS identity lookup includes entries without address and inactive entries", () => {
  const snapshot = {
    generatedAt: "2026-09-01T00:00:00Z",
    pmej: [
      {
        ege: [
          {
            informationsGeneralesEGE: {
              numFinessEge: "010000001",
              nomEgeLong: "FICTIF",
            },
            etatObjet: "F",
          },
        ],
      },
    ],
  };
  const rows = normalizeFiness(snapshot);
  expect(rows[0].longitude).toBe(null);
  expect(rows[0].status).toBe("F");
  expect(() => normalizeFiness({ ...snapshot, pmej: [] })).toThrow();
  snapshot.pmej[0]!.ege.push(snapshot.pmej[0]!.ege[0]!);
  expect(() => normalizeFiness(snapshot)).toThrow("duplicate");
});
