import { test, before as beforeAll, after as afterAll } from "node:test";
import { expect } from "expect";
import {
  match,
  Professional,
  MatchMission,
  covers,
  experienceMonths,
  interval,
} from "../../src/domain/matching";
const slot = { start: "2030-01-10T20:00:00Z", end: "2030-01-11T06:00:00Z" };
const m: MatchMission = {
  ...slot,
  status: "OPEN",
  qualification: "IDE",
  service: "URGENCES",
  requiredSkills: ["TRIAGE"],
  desiredSkills: [],
  minExperienceMonths: 0,
  population: "ADULT",
  block: "NONE",
  specialty: null,
  shift: "NIGHT",
  latitude: 48,
  longitude: 2,
};
const p: Professional = {
  qualifications: ["IDE", "IADE"],
  skills: ["TRIAGE"],
  experience: [],
  available: [slot],
  unavailable: [],
  conflicts: [],
  rppsStatus: "FOUND",
  latitude: 48,
  longitude: 2,
  radiusKm: 30,
  acceptedShifts: ["NIGHT"],
  preferredShifts: [],
};
test("night requires full availability including next day", () => {
  expect(
    match({ ...p, available: [{ ...slot, end: "2030-01-11T00:00:00Z" }] }, m)
      .reasons,
  ).toContain("NOT_FULLY_AVAILABLE");
});
test("adjacent intervals merge but gaps do not", () => {
  const a = { start: slot.start, end: "2030-01-11T00:00:00Z" },
    b = { start: a.end, end: slot.end };
  expect(covers(slot, [a, b], [])).toBe(true);
  expect(covers(slot, [a, { ...b, start: "2030-01-11T00:00:01Z" }], [])).toBe(
    false,
  );
  expect(
    covers(slot, [slot], [{ start: a.end, end: "2030-01-11T00:01:00Z" }]),
  ).toBe(false);
});
for (const status of ["NOT_FOUND", "PENDING", "NOT_CHECKED"] as const)
  test("RPPS " + status + " cannot be offset by score", () => {
    expect(match({ ...p, rppsStatus: status }, m)).toMatchObject({
      eligible: false,
      score: null,
    });
  });
test("no IADE to IBODE equivalence", () => {
  expect(match(p, { ...m, qualification: "IBODE" }).reasons).toContain(
    "QUALIFICATION_MISSING",
  );
});
test("mixed population requires both competencies", () => {
  expect(
    match(
      { ...p, skills: ["TRIAGE", "POPULATION_ADULT"] },
      { ...m, qualification: "IADE", population: "MIXED", block: "GENERAL" },
    ).eligible,
  ).toBe(false);
});
test("unknown location is not zero distance", () => {
  expect(match({ ...p, latitude: null }, m)).toMatchObject({
    score: null,
    distanceKm: null,
  });
});
test("consecutive assignments do not overlap", () => {
  expect(
    match(
      { ...p, conflicts: [{ start: slot.end, end: "2030-01-11T07:00:00Z" }] },
      m,
    ).eligible,
  ).toBe(true);
});
test("overlapping experience counted once", () => {
  const e = {
    start: "2025-01-01T00:00:00Z",
    end: "2026-01-01T00:00:00Z",
    service: "URGENCES",
  };
  expect(experienceMonths([e, e], "URGENCES", slot.start)).toBeCloseTo(
    11.9918,
    3,
  );
});
test("timezone required and interval positive", () => {
  expect(() =>
    interval({ start: "2030-01-01T01:00", end: slot.end }),
  ).toThrow();
  expect(() => interval({ start: slot.end, end: slot.start })).toThrow();
});

test("documented score example is 93.75 and exposes components", () => {
  const result = match(
    {
      ...p,
      experience: [
        {
          service: "URGENCES",
          start: "2020-01-01T00:00:00Z",
          end: "2025-01-01T00:00:00Z",
        },
      ],
    },
    m,
    7.5,
  );
  expect(result.score).toBe(93.75);
  expect(result.components).toEqual({ C: 1, Z: 0.75, D: 1, E: 1 });
});

test("date-only requests never invent all-day availability or conflicts", () => {
  expect(match({ ...p, available: [], unavailable: [slot], conflicts: [slot], acceptedShifts: [] }, { ...m, schedulePrecision: "DATE", shift: "UNKNOWN" })).toMatchObject({ eligible: false, score: null, components: null, reasons: ["SCHEDULE_UNCONFIRMED"] });
});
test("unconfirmed schedule still checks qualification and RPPS", () => {
  expect(match({ ...p, qualifications: [], rppsStatus: "PENDING" }, { ...m, schedulePrecision: "DATE", shift: "UNKNOWN" }).reasons).toEqual(["QUALIFICATION_MISSING", "RPPS_PENDING", "SCHEDULE_UNCONFIRMED"]);
});
test("unknown shift does not create a shift preference mismatch or score", () => {
  expect(match(p, { ...m, schedulePrecision: "EXACT", shift: "UNKNOWN" })).toMatchObject({ eligible: false, score: null, reasons: ["SCHEDULE_UNCONFIRMED"] });
  expect(match({ ...p, conflicts: [slot] }, { ...m, schedulePrecision: "EXACT", shift: "UNKNOWN" }).reasons).toEqual(["SCHEDULE_UNCONFIRMED", "ASSIGNMENT_CONFLICT"]);
});
test("explicit exact precision preserves legacy matching results", () => {
  expect(match(p, { ...m, schedulePrecision: "EXACT" })).toEqual(match(p, m));
  expect(match({ ...p, available: [], conflicts: [slot] }, { ...m, schedulePrecision: "EXACT" })).toEqual(match({ ...p, available: [], conflicts: [slot] }, m));
});


test("practice services are alternatives within the mission qualification", () => {
  const profile = { ...p, practiceServices: { IDE: ["URGENCES", "REANIMATION"], IADE: ["ANESTHESIE"] } };
  expect(match(profile, m).eligible).toBe(true);
  expect(match(profile, { ...m, service: "REANIMATION" }).eligible).toBe(true);
  expect(match(profile, { ...m, service: "ANESTHESIE" }).reasons).toContain("SERVICE_NOT_PREFERRED");
  expect(match({ ...profile, skills: [...p.skills, "POPULATION_ADULT"] }, { ...m, qualification: "IADE", service: "ANESTHESIE" }).eligible).toBe(true);
  expect(match(profile, { ...m, qualification: "IADE", service: "URGENCES" }).reasons).toContain("SERVICE_NOT_PREFERRED");
});
test("empty and missing service preferences preserve existing matching", () => {
  for (const practiceServices of [undefined, {}, { IDE: [] }, { IADE: ["ANESTHESIE"] }])
    expect(match({ ...p, practiceServices }, m)).toEqual(match(p, m));
});
