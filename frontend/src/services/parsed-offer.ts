import {sourceOfferFields} from '@/lib/parsedOfferSource';
export type ParsedField = { key: string; label: string; display: string; value: unknown; state: string; evidence: {origin: string; text: string; start: number; end: number} };
export type ParsedOffer = { schemaVersion: number; parserVersion: string; inputHash: string; parsedAt: string; fields: ParsedField[]; warnings: string[]; reviewQueue: string[] };
export function extractedSidebar(offer?: ParsedOffer | null) {
 const fields=sourceOfferFields(offer?.fields || []);
 return { schedules: fields.filter(f=>["horaires_detail","alternance","duree_poste_heures","roulement"].includes(f.key) && f.state!=="NEGATED").slice(0,4).map(f=>({...f,display:f.evidence.text})), pay: fields.find(f=>f.key==="remuneration_texte")?.evidence.text };
}
