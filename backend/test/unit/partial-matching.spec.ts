import { test } from "node:test";
import { expect } from "expect";
import { partialOfferMatch } from "../../src/public-data/partial-matching";
import { normalizeOffer } from "../../src/public-data/offers";
import { Professional, Qualification } from "../../src/domain/matching";
const now = "2030-01-01T00:00:00Z";
const profile: Professional = {
  qualifications: ["IDE"],
  skills: [],
  experience: [
    {
      service: "URGENCES",
      start: "2027-01-01T00:00:00Z",
      end: "2029-12-31T00:00:00Z",
    },
  ],
  available: [],
  unavailable: [],
  conflicts: [],
  rppsStatus: "FOUND",
  latitude: 48.8566,
  longitude: 2.3522,
  radiusKm: 20,
  acceptedShifts: ["DAY"],
  preferredShifts: [],
};
const offer = (title = "IDE Urgences", changes: any = {}) =>
  normalizeOffer({
    id: "PARTIAL_TEST",
    intitule: title,
    description: "Mission fictive",
    typeContrat: "MIS",
    experienceLibelle: "1 An(s)",
    lieuTravail: { libelle: "Paris", latitude: 48.85, longitude: 2.35 },
    dureeTravailLibelle: "Travail en journée",
    ...changes,
  });
for (const qualification of ["IDE", "IADE", "IBODE"] as Qualification[])
  test(
    "partial " +
      qualification +
      " comparison never proves availability or full eligibility",
    () => {
      const r = partialOfferMatch(
        offer(qualification + " Urgences"),
        { ...profile, qualifications: [qualification] },
        now,
      );
      expect(r.criteria.qualification?.status).toBe("MATCH");
      expect(r.criteria.service?.status).toBe("INDICATIVE_MATCH");
      expect(r.criteria.availability?.status).toBe("OFFER_MISSING");
      expect(r.criteria.assignmentConflicts?.status).toBe("OFFER_MISSING");
      expect(r.criteria.requiredSkills?.status).toBe("OFFER_MISSING");
      expect(r.score).toBeNull();
      expect(r.eligibilityVerified).toBe(false);
      expect(r.result).toBe("POSSIBLE_MATCH");
    },
  );
test("known qualification mismatch is distinct from unavailable evidence", () => {
  expect(partialOfferMatch(offer("IBODE"), profile, now).result).toBe(
    "KNOWN_MISMATCH",
  );
  const unknown = partialOfferMatch({ title: "Offre ancienne" }, profile, now);
  expect(unknown.result).toBe("TO_CONFIRM");
  expect(unknown.criteria.qualification?.status).toBe("OFFER_MISSING");
  expect(unknown.knownMismatches).toEqual([]);
});
test("RPPS not found blocks and pending stays pending even with matching qualification", () => {
  expect(
    partialOfferMatch(offer(), { ...profile, rppsStatus: "NOT_FOUND" }, now)
      .result,
  ).toBe("BLOCKED_RPPS");
  expect(
    partialOfferMatch(offer(), { ...profile, rppsStatus: "PENDING" }, now)
      .result,
  ).toBe("RPPS_PENDING");
  expect(
    partialOfferMatch(offer(), { ...profile, rppsStatus: "NOT_CHECKED" }, now)
      .result,
  ).toBe("TO_CONFIRM");
});
test("missing profile experience is a completion request, not proof of absent competence", () => {
  const r = partialOfferMatch(offer(), { ...profile, experience: [] }, now);
  expect(r.profileToComplete).toEqual(
    expect.arrayContaining(["service", "experience"]),
  );
  expect(r.knownMismatches).toEqual([]);
  const future = partialOfferMatch(
    offer(),
    {
      ...profile,
      experience: [
        {
          service: "URGENCES",
          start: "2031-01-01T00:00:00Z",
          end: "2032-01-01T00:00:00Z",
        },
      ],
    },
    now,
  );
  expect(future.criteria.service?.status).toBe("PROFILE_MISSING");
  expect(future.criteria.experience?.status).toBe("INDICATIVE_MISMATCH");
});
test("approximate location and shifts remain indicative and cannot prove incompatibility", () => {
  const r = partialOfferMatch(
    offer(),
    { ...profile, latitude: 43, longitude: 5, acceptedShifts: ["NIGHT"] },
    now,
  );
  expect(r.criteria.location?.status).toBe("INDICATIVE_MISMATCH");
  expect(r.criteria.shift?.status).toBe("INDICATIVE_MISMATCH");
  expect(r.knownMismatches).toEqual([]);
  expect(r.result).toBe("TO_CONFIRM");
  expect(
    partialOfferMatch(offer(), { ...profile, latitude: null }, now).criteria
      .location?.status,
  ).toBe("PROFILE_MISSING");
  expect(
    partialOfferMatch(
      offer("IDE", { lieuTravail: { libelle: "Paris" } }),
      profile,
      now,
    ).criteria.location?.status,
  ).toBe("OFFER_MISSING");
});
test("conflicting and ambiguous provider facts are not made into matches", () => {
  const r = partialOfferMatch(
    offer("IDE Paris 16e", {
      lieuTravail: { libelle: "Paris 15e", latitude: 48.85, longitude: 2.35 },
      experienceLibelle: "Débutant accepté",
      description: "Expérience minimum de 2 ans. Poste en CDD.",
      dureeTravailLibelle: "Travail en journée et travail de nuit",
    }),
    profile,
    now,
  );
  expect(r.criteria.location?.status).toBe("REVIEW_REQUIRED");
  expect(r.criteria.experience?.status).toBe("REVIEW_REQUIRED");
  expect(r.criteria.shift?.status).toBe("OFFER_MISSING");
  expect(r.criteria.contract?.reason).toBe("PROVIDER_CONTRACT_CONFLICT");
  expect(r.result).toBe("TO_CONFIRM");
});

test("transport emergency words do not imply emergency department experience",()=>{
 const result=partialOfferMatch({title:'IDE transport SAMU urgences AVC',provenance:{facts:{qualification:'IDE',warnings:[]}}},profile,now);
 expect(result.criteria.service!.status).toBe('OFFER_MISSING');
 const explicit=partialOfferMatch({title:'IDE aux urgences',provenance:{facts:{qualification:'IDE',warnings:[]}}},profile,now);
 expect(explicit.criteria.service!.status).toBe('INDICATIVE_MATCH');
});
