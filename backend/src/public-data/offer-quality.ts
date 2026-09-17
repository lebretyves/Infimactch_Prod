import { offerLocationCoordinates } from "./offer-geolocation";
import { currentParsedOffer } from "./offer-parser";
import type { Qualification } from "../domain/matching";

export function clean(value: unknown, max: number): string {
  return typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";
}
/** Keep clause boundaries: a contract label on its own line is meaningful. */
export function cleanDescription(value: unknown, max = 32000): string {
  return typeof value === "string" ? value
    .replace(/<\s*(?:br\s*\/?|\/?(?:p|div|li|ul|ol|h[1-6]))\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim().slice(0, max) : "";
}
const folded = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

// A job classification is not verification of a professional's diploma.
export function offerFacts(raw: any) {
  const title = folded(clean(raw.intitule, 300));
  const description = folded(clean(raw.description, 8000));
  const warnings: string[] = [];
  const specialized: Qualification[] = [];
  if (/\bIADE\b|ANESTHESISTE/.test(title)) specialized.push("IADE");
  if (/\bIBODE\b/.test(title)) specialized.push("IBODE");
  let qualification: Qualification | null = null;
  if (specialized.length === 1) qualification = specialized[0]!;
  else if (specialized.length > 1) warnings.push("QUALIFICATION_AMBIGUOUS");
  else if (/\bIBO\b|BLOC OPERATOIRE/.test(title)) {
    // Only an explicit diploma requirement can resolve an ambiguous block title.
    if (
      /DIPLOME D['’ ]ETAT (?:D['’ ]|DE )?INFIRMIER(?:E)? DE BLOC OPERATOIRE/.test(
        description,
      ) ||
      /\bIBODE\s+(?:EXIGE|OBLIGATOIRE|REQUIS)/.test(description)
    )
      qualification = "IBODE";
    else warnings.push("BLOCK_DIPLOMA_UNCONFIRMED");
  } else if (/\bIDE\b|\bINFIRMIER/.test(title)) qualification = "IDE";
  if (!qualification) warnings.push("QUALIFICATION_UNCONFIRMED");
  if (/\bCDI\b|\bCDD\b|\bVACATIONS?\b/.test(description))
    warnings.push("CONTRACT_TEXT_REVIEW_REQUIRED");
  const experience = clean(raw.experienceLibelle, 300) || null;
  if (
    experience &&
    /DEBUTANT ACCEPTE/.test(folded(experience)) &&
    /EXPERIENCE.{0,100}(?:EXIG|OBLIGATOIRE|MINIMUM|SIGNIFICATIVE)|(?:\d+|UN|UNE|DEUX)\s+AN.{0,40}EXPERIENCE/.test(
      description,
    )
  )
    warnings.push("EXPERIENCE_TEXT_REVIEW_REQUIRED");
  const locationCoordinates = offerLocationCoordinates(raw);
  const locationLabel = clean(raw.lieuTravail?.libelle, 200) || null;
  // Report potentially conflicting Paris arrondissement indications without guessing an address.
  const arr = (s: string) =>
    [...s.matchAll(/PARIS\s+(\d{1,2})(?:E|EME|ER|\b)/g)].map((m) =>
      Number(m[1]),
    );
  const places = new Set([...arr(folded(locationLabel || "")), ...arr(title)]);
  if (places.size > 1) warnings.push("LOCATION_TEXT_REVIEW_REQUIRED");
  return {
    qualification,
    providerClassification: { code: clean(raw.romeCode, 20) || null, label: clean(raw.romeLibelle, 200) || null, reference: raw.romeCode ? "ROME" : null },
    qualificationBasis: qualification
      ? "PROVIDER_TEXT_CLASSIFICATION"
      : "UNCONFIRMED",
    location: {
      label: locationLabel,
      commune: clean(raw.lieuTravail?.commune, 10) || null,
      postalCode: clean(raw.lieuTravail?.codePostal, 10) || null,
      ...locationCoordinates,
    },
    contract: {
      code: clean(raw.typeContrat, 10),
      label: clean(raw.typeContratLibelle, 200) || null,
    },
    experience: {
      label: experience,
      requirement: clean(raw.experienceExige, 10) || null,
    },
    workingTime: clean(raw.dureeTravailLibelle, 300) || null,
    skills: (Array.isArray(raw.competences) ? raw.competences : [])
      .slice(0, 100)
      .map((s: any) => ({
        code: clean(s?.code, 50),
        label: clean(s?.libelle, 300),
        requirement: clean(s?.exigence, 10) || null,
      })),
    education: (Array.isArray(raw.formations) ? raw.formations : [])
      .slice(0, 30)
      .map((f: any) => ({
        label: clean(f?.domaineLibelle, 300),
        level: clean(f?.niveauLibelle, 150),
        requirement: clean(f?.exigence, 10) || null,
      })),
    warnings,
  };
}

export function externalPresentation(e: any) {
  const { raw_hash: _hash, parsed_offer: _parsed, ...safe } = e;
  const facts = e.provenance?.facts;
  const warnings: string[] = facts?.warnings ?? [
    "LEGACY_OFFER_REIMPORT_REQUIRED",
  ];
  const state = (present: boolean, warning?: string) =>
    warning && warnings.includes(warning)
      ? "REVIEW_REQUIRED"
      : present
        ? "PROVIDER_REPORTED"
        : "UNKNOWN";
  return {
    ...safe,
    parsedOffer: currentParsedOffer(e),
    freshness: {
      lastSeenAt: e.imported_at ?? null,
      staleAfterDays: 30,
      state:
        e.expires_at && new Date(e.expires_at).getTime() <= Date.now()
          ? "EXPIRED"
          : !e.imported_at ||
              new Date(e.imported_at).getTime() < Date.now() - 30 * 86400000
            ? "STALE_UNVERIFIED"
            : "RECENTLY_SEEN",
    },
    kind: "EXTERNAL_OFFER",
    applicationMode: "REDIRECT",
    eligibility: "INCOMPLETE",
    correspondence: {
      mode: "EXTERNAL_CRITERIA",
      score: null,
      eligibilityVerified: false,
      criteria: {
        qualification: {
          value: facts?.qualification ?? null,
          status: state(Boolean(facts?.qualification)),
        },
        location: {
          value: facts?.location ?? null,
          status: state(
            Boolean(facts?.location?.label),
            "LOCATION_TEXT_REVIEW_REQUIRED",
          ),
        },
        contract: {
          value: facts?.contract ?? null,
          status: state(
            Boolean(facts?.contract),
            "CONTRACT_TEXT_REVIEW_REQUIRED",
          ),
        },
        experience: {
          value: facts?.experience ?? null,
          status: state(
            Boolean(facts?.experience?.label),
            "EXPERIENCE_TEXT_REVIEW_REQUIRED",
          ),
        },
        workingTime: {
          value: facts?.workingTime ?? null,
          status: state(Boolean(facts?.workingTime)),
        },
      },
      warnings,
      missingForFullMatching: [
        "EXACT_MISSION_DATES",
        "CONFIRMED_SHIFTS",
        "VERIFIED_WORKPLACE",
        "STRUCTURED_REQUIREMENTS",
        "PROFESSIONAL_ELIGIBILITY",
      ],
    },
  };
}
