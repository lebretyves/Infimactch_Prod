export type ParsedField = { key: string; label: string; display: string; value: unknown; state: string; evidence: {origin: string; text: string; start: number; end: number} };
export type ParsedOffer = { schemaVersion: number; parserVersion: string; inputHash: string; parsedAt: string; fields: ParsedField[]; warnings: string[]; reviewQueue: string[] };

const singleHour = /^\s*\d{1,2}\s*h(?:\s*\d{2})?\s*$/i;

function scheduleDisplay(field: ParsedField) {
  let display = field.key === "horaires_detail"
    ? field.display.replace(/^.*?horaires?(?: de travail)?\s*:\s*/i, "")
    : field.display;
  // If the label was truncated to a single hour but the evidence still has a range, keep both bounds.
  if (field.key === "horaires_detail" && singleHour.test(display) && /[hH].*(-|–|—|à|a).*\d/.test(field.evidence.text)) {
    display = field.evidence.text.trim() + " — à confirmer dans l’annonce source";
  }
  return { ...field, display };
}

export function extractedSidebar(offer?: ParsedOffer | null) {
 const fields=offer?.fields || [];
 return {
  schedules: fields
    .filter(f=>["horaires_detail","alternance","duree_poste_heures","roulement"].includes(f.key) && f.state!=="NEGATED")
    .slice(0,4)
    .map(scheduleDisplay),
  pay: fields.find(f=>f.key==="remuneration_texte")?.display,
 };
}
