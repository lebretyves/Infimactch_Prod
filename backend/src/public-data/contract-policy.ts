const fold = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const partsOf = (description: string) =>
  description.replace(/([.!?])(?=[A-Z])/g, "$1\n").split(/[.!?;](?:\s+|$)|\n|\s+-\s+/);
const recruiterPresentation = (s: string) =>
  /(?:notre |le )?cabinet.{0,100}accompagne|agence.{0,80}recrutement|que vous recherchiez|vous proposant des contrats|recrutement cdd.cdi|description societe/.test(
    s,
  );

/** Conservative detection of an explicitly advertised permanent position. */
export function permanentContractEvidence(
  title: string,
  description: string,
): string | null {
  const permanent = /\bcdi\b|contrat a duree indeterminee/;
  if (permanent.test(fold(title))) return title;
  for (const part of partsOf(description)) {
    const s = fold(part);
    if (!permanent.test(s)) continue;
    // A future conversion or a replacement of a permanent employee is not this job's contract.
    if (
      /possibilite.{0,40}cdi|perspective.{0,40}cdi|debouch.{0,40}cdi|evolu.{0,40}cdi|remplacement.{0,40}cdi|sans cdi|pas de cdi/.test(
        s,
      )
    )
      continue;
    if (recruiterPresentation(s)) continue;
    if (
      /\b(?:poste|contrat|recrutons|recherchons)\b.{0,260}(?:\bcdi\b|contrat a duree indeterminee)/.test(
        s,
      ) ||
      /^\s*cdi\b/.test(s)
    )
      return part.trim();
  }
  return null;
}

/** Interim must describe the job, not the recruiting agency. */
export function interimContractEvidence(
  title: string,
  description: string,
): string | null {
  const interim = /\binterim(?:aire)?s?\b/;
  if (interim.test(fold(title))) return title;
  for (const part of partsOf(description)) {
    const s = fold(part);
    if (!interim.test(s)) continue;
    if (recruiterPresentation(s)) continue;
    if (
      /\b(?:cabinet|agence) d[' ]interim\b/.test(s) &&
      !/\b(?:poste|mission|contrat|recrutons|recherchons)\b/.test(s)
    )
      continue;
    if (
      /\b(?:postes?|missions?|contrats?|recrutons|recherchons|vacataires?|vacations?|remplacements?)\b.{0,260}interim/.test(
        s,
      ) ||
      /interim.{0,80}\b(?:postes?|missions?|contrats?|vacataires?|vacations?)\b/.test(s) ||
      /^\s*interim(?:aire)?s?\b/.test(s)
    )
      return part.trim();
  }
  return null;
}

export const offerRetirementReasons = new Set([
  "PERMANENT_POSITION_EXCLUDED",
  "NOT_TEMPORARY_EMPLOYMENT",
  "INTERIM_UNCONFIRMED",
  "OFFER_NOT_ACTIVE",
  "OFFER_CLOSED",
  "OFFER_EXPIRED",
]);
