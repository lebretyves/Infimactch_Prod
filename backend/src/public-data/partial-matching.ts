import { Professional, distanceKm, experienceMonths } from "../domain/matching";

type State =
  | "MATCH"
  | "MISMATCH"
  | "INDICATIVE_MATCH"
  | "INDICATIVE_MISMATCH"
  | "PROFILE_MISSING"
  | "OFFER_MISSING"
  | "REVIEW_REQUIRED";
type Criterion = { status: State; reason: string; value?: unknown };
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
const servicePatterns: [string, RegExp][] = [
  ["URGENCES", /\bURGENCES\b/],
  ["REANIMATION", /\bREANIMATION\b/],
  ["CARDIOLOGIE", /\bCARDIOLOGIE\b|\bCARDIOLOGIQUE/],
  ["ONCOLOGIE", /\bONCOLOGIE\b|\bONCOLOGIQUE/],
  ["DIALYSE", /\bDIALYSE\b|\bAUTODIALYSE\b|\bHEMODIALYSE\b/],
  ["NEPHROLOGIE", /\bNEPHROLOGIE\b/],
  ["PNEUMOLOGIE", /\bPNEUMOLOGIE\b/],
  ["GERIATRIE", /\bGERIATRIE\b/],
  ["PEDIATRIE", /\bPEDIATRIE\b/],
  ["PSYCHIATRIE", /\bPSYCHIATRIE\b/],
];
export function partialOfferMatch(
  offer: any,
  p: Professional,
  now = new Date().toISOString(),
) {
  const f = offer.provenance?.facts;
  const warnings: string[] = f?.warnings ?? ["LEGACY_OFFER_REIMPORT_REQUIRED"];
  const criteria: Record<string, Criterion> = {};
  const c = (key: string, status: State, reason: string, value?: unknown) => {
    criteria[key] = {
      status,
      reason,
      ...(value === undefined ? {} : { value }),
    };
  };
  if (!f?.qualification)
    c("qualification", "OFFER_MISSING", "OFFER_QUALIFICATION_UNCONFIRMED");
  else if (!p.qualifications.length)
    c("qualification", "PROFILE_MISSING", "ADD_PROFILE_QUALIFICATIONS");
  else
    c(
      "qualification",
      p.qualifications.includes(f.qualification) ? "MATCH" : "MISMATCH",
      "DECLARED_QUALIFICATION_COMPARISON",
      f.qualification,
    );

  // Service labels are hints from an unambiguous title, not verified mandatory skills.
  const title = fold(offer.title ?? "");
  const services = servicePatterns
    .filter(([, pattern]) => pattern.test(title))
    .map(([s]) => s);
  if (services.length !== 1)
    c("service", "OFFER_MISSING", "SERVICE_NOT_UNAMBIGUOUS");
  else {
    const service = services[0]!;
    const relevant = p.experience.filter((e) => fold(e.service) === service);
    if (!relevant.length)
      c(
        "service",
        "PROFILE_MISSING",
        "SERVICE_EXPERIENCE_NOT_RECORDED",
        service,
      );
    else
      c(
        "service",
        experienceMonths(
          relevant.map((e) => ({ ...e, service })),
          service,
          now,
        ) > 0
          ? "INDICATIVE_MATCH"
          : "PROFILE_MISSING",
        "TITLE_SERVICE_VS_DECLARED_EXPERIENCE",
        service,
      );
  }

  const rawExperience = fold(f?.experience?.label ?? "");
  const amount = rawExperience.match(/^(\d+)\s*(MOIS|AN(?:\(S\)|S)?)$/);
  if (warnings.includes("EXPERIENCE_TEXT_REVIEW_REQUIRED"))
    c("experience", "REVIEW_REQUIRED", "PROVIDER_EXPERIENCE_CONFLICT");
  else if (!amount)
    c("experience", "OFFER_MISSING", "EXPERIENCE_THRESHOLD_NOT_UNAMBIGUOUS");
  else if (!p.experience.length)
    c("experience", "PROFILE_MISSING", "ADD_PROFILE_EXPERIENCE");
  else {
    const minimum = Number(amount[1]) * (amount[2] === "MOIS" ? 1 : 12);
    const months = experienceMonths(
      p.experience.map((e) => ({ ...e, service: "ALL" })),
      "ALL",
      now,
    );
    c(
      "experience",
      months >= minimum ? "INDICATIVE_MATCH" : "INDICATIVE_MISMATCH",
      "TOTAL_DECLARED_EXPERIENCE_NOT_SERVICE_ELIGIBILITY",
      {
        minimumMonths: minimum,
        declaredMonths: Math.round(months * 100) / 100,
      },
    );
  }

  const loc = f?.location?.coordinates;
  if (warnings.includes("LOCATION_TEXT_REVIEW_REQUIRED"))
    c("location", "REVIEW_REQUIRED", "PROVIDER_LOCATION_CONFLICT");
  else if (
    !loc ||
    !Number.isFinite(loc.latitude) ||
    !Number.isFinite(loc.longitude) ||
    Math.abs(loc.latitude) > 90 ||
    Math.abs(loc.longitude) > 180
  )
    c("location", "OFFER_MISSING", "EXACT_WORKPLACE_NOT_PROVIDED");
  else if (
    p.latitude === null ||
    p.longitude === null ||
    p.radiusKm === null ||
    !Number.isFinite(p.latitude) ||
    !Number.isFinite(p.longitude) ||
    !Number.isFinite(p.radiusKm) ||
    p.radiusKm <= 0
  )
    c("location", "PROFILE_MISSING", "COMPLETE_PROFILE_MOBILITY");
  else {
    const km = distanceKm(p.latitude, p.longitude, loc.latitude, loc.longitude);
    c(
      "location",
      km <= p.radiusKm ? "INDICATIVE_MATCH" : "INDICATIVE_MISMATCH",
      "UNVERIFIED_PROVIDER_COORDINATES",
      { approximateDistanceKm: Math.round(km * 100) / 100 },
    );
  }

  const working = fold(f?.workingTime ?? "");
  const day = /TRAVAIL EN JOURNEE/.test(working),
    night = /TRAVAIL DE NUIT|TRAVAIL EN NUIT/.test(working);
  if (day === night) c("shift", "OFFER_MISSING", "SHIFT_NOT_UNAMBIGUOUS");
  else if (!p.acceptedShifts.length)
    c("shift", "PROFILE_MISSING", "ADD_ACCEPTED_SHIFTS");
  else {
    const shift = day ? "DAY" : "NIGHT";
    c(
      "shift",
      p.acceptedShifts.includes(shift)
        ? "INDICATIVE_MATCH"
        : "INDICATIVE_MISMATCH",
      "PROVIDER_SHIFT_NOT_EXACT_SCHEDULE",
      shift,
    );
  }
  c("availability", "OFFER_MISSING", "EXACT_DATES_REQUIRED");
  c("assignmentConflicts", "OFFER_MISSING", "EXACT_DATES_REQUIRED");
  c("requiredSkills", "OFFER_MISSING", "PROVIDER_REQUIREMENTS_NOT_MAPPED");
  c(
    "contract",
    "REVIEW_REQUIRED",
    warnings.includes("CONTRACT_TEXT_REVIEW_REQUIRED")
      ? "PROVIDER_CONTRACT_CONFLICT"
      : "NO_CONTRACT_PREFERENCE_IN_PROFILE",
  );
  if (p.rppsStatus === "FOUND")
    c("rpps", "MATCH", "RPPS_FOUND_NOT_FULL_ELIGIBILITY");
  else if (p.rppsStatus === "NOT_FOUND")
    c("rpps", "MISMATCH", "RPPS_NOT_FOUND");
  else
    c(
      "rpps",
      "REVIEW_REQUIRED",
      p.rppsStatus === "PENDING" ? "RPPS_PENDING" : "RPPS_NOT_CHECKED",
    );

  const knownMismatch = Object.entries(criteria)
    .filter(([, x]) => x.status === "MISMATCH")
    .map(([key]) => key);
  const indicativeMismatch = Object.entries(criteria)
    .filter(([, x]) => x.status === "INDICATIVE_MISMATCH")
    .map(([key]) => key);
  const result =
    p.rppsStatus === "NOT_FOUND"
      ? "BLOCKED_RPPS"
      : knownMismatch.length
        ? "KNOWN_MISMATCH"
        : p.rppsStatus === "PENDING"
          ? "RPPS_PENDING"
          : indicativeMismatch.length ||
              p.rppsStatus !== "FOUND" ||
              !f?.qualification ||
              warnings.length
            ? "TO_CONFIRM"
            : "POSSIBLE_MATCH";
  return {
    mode: "PARTIAL_PROFILE_COMPARISON",
    rulesVersion: "external-partial-v1",
    comparedAt: now,
    result,
    score: null,
    eligibilityVerified: false,
    criteria,
    knownMismatches: knownMismatch,
    indicativeMismatches: indicativeMismatch,
    profileToComplete: Object.entries(criteria)
      .filter(([, x]) => x.status === "PROFILE_MISSING")
      .map(([key]) => key),
    offerToClarify: Object.entries(criteria)
      .filter(
        ([key, x]) =>
          x.status === "OFFER_MISSING" ||
          (x.status === "REVIEW_REQUIRED" && key !== "rpps"),
      )
      .map(([key]) => key),
    warnings,
    applicationMode: "REDIRECT",
  };
}
