import {isJobServiceEvidence} from './service-evidence';
import { createHash } from "node:crypto";
import { parseOfferV3 } from "./parser/legacy-v3";
import { fold } from "./parser/legacy-v2";
export const PARSER_VERSION = "4.1.1";
export type ParsedField = { key: string; label: string; value: unknown; display: string; state: "REPORTED" | "MENTION" | "DESIRED" | "REQUIRED" | "NEGATED" | "REVIEW_REQUIRED"; evidence: { origin: "TITLE" | "DESCRIPTION"; text: string; start: number; end: number } };
export type ParsedOffer = { schemaVersion: 1; parserVersion: string; inputHash: string; parsedAt: string; fields: ParsedField[]; warnings: string[]; reviewQueue: string[] };
export type ParserInput = { title?: string; description?: string; location_label?: string; qualification?: string | null; source?: string; provenance?: any };
function canonical(value: any): any {
 if(Array.isArray(value)) return value.map(canonical);
 if(value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 return value;
}
export function parserInputHash(row: ParserInput) {
  return createHash("sha256").update(JSON.stringify(canonical([row.title || "", row.description || "", row.location_label || "", row.qualification || null, row.provenance?.facts ?? null, row.provenance?.salaryRaw ?? null]))).digest("hex");
}
const labels: Record<string,string> = {
 qualification_titre:"Métier",service:"Service mentionné",specialite:"Spécialité mentionnée",population:"Population mentionnée",competence:"Compétence mentionnée",certification:"Diplôme ou certification",equipement:"Matériel",langue:"Langue",experience_domaine:"Domaine d’expérience",experience_duree:"Durée d’expérience",experience_non_chiffree:"Expérience",alternatives_professionnelles:"Alternatives de qualification",contrat_texte:"Contrat mentionné",temps_travail:"Temps de travail",quotite_pct:"Quotité",horaire_type:"Jour ou nuit",alternance:"Alternance",horaires_detail:"Horaires",duree_poste_heures:"Durée du poste",durees_poste_alternatives:"Durées possibles",pause:"Pause",pause_minutes:"Durée de pause",roulement:"Roulement",jours_travailles_semaine:"Jours par semaine",jours_nommes:"Jours annoncés",remuneration_texte:"Rémunération",remuneration_non_chiffree:"Rémunération à préciser",salaire_structure:"Montant annoncé",avantage:"Avantage mentionné",montant_avantage:"Indemnité à préciser",taux_avantages:"Taux et primes",acompte:"Acompte",mobilite:"Mobilité",permis:"Permis",logiciel:"Logiciel",charge_et_equipe:"Équipe et charge",periode_texte:"Période annoncée",dates_mission:"Dates annoncées",duree_mission:"Durée de mission",debut_mission:"Début de mission",debutant_accepte:"Débutant accepté",garde_astreinte:"Gardes ou astreintes",condition_experience:"Condition d’expérience à vérifier",contraintes_planning:"Contraintes de planning",disponibilites_a_declarer:"Disponibilités à déclarer",contexte_parcours:"Contexte de soins",accessibilite_candidature:"Accessibilité des candidatures",activite_transport_sanitaire:"Transport sanitaire",majoration_horaire:"Majoration horaire",dates_incompletes:"Dates incomplètes"
};
/** Text ranges are display evidence, never dated availability or matching constraints. */
export function hourPairsFromText(text: string) {
 const pairs: { start: string; end: string; evidence: string }[] = [];
 for (const m of text.matchAll(/(?<!\d)(?<!\d:)([01]?\d|2[0-3])\s*(?:[hH]\s*([0-5]\d)?|:([0-5]\d))\s*(?:-|–|—|à|a)\s*([01]?\d|2[0-3])\s*(?:[hH]\s*([0-5]\d)?|:([0-5]\d))(?!\d)/g)) {
  pairs.push({start:m[1]!.padStart(2,"0")+":"+(m[2]||m[3]||"00"),end:m[4]!.padStart(2,"0")+":"+(m[5]||m[6]||"00"),evidence:m[0].trim()});
 }
 return pairs;
}
function clauses(text: string): string[] { return text.split(/\n|;|[.!?](?=\s+[A-ZÀ-Ý])|\s+-\s+(?=[A-ZÀ-Ý])/).map(x=>x.trim()).filter(Boolean); }
export function parseOffer(row: ParserInput, at = new Date().toISOString()): ParsedOffer {
 const result: ParsedOffer = {schemaVersion:1,parserVersion:PARSER_VERSION,inputHash:parserInputHash(row),parsedAt:at,fields:[],warnings:[],reviewQueue:[]};
 const legacy = parseOfferV3(row);
 const add = (key: string, value: unknown, text: string, origin: "TITLE" | "DESCRIPTION", state: ParsedField["state"]) => {
  const source = origin === "TITLE" ? row.title || "" : row.description || "";
  const start = source.indexOf(text);
  if(start < 0 || !text.trim()) return;
  if(result.fields.some(f=>f.key===key && JSON.stringify(f.value)===JSON.stringify(value) && f.evidence.text===text)) return;
  result.fields.push({key,label:labels[key] || "Information mentionnée",value,display:text,state,evidence:{origin,text,start,end:start+text.length}});
 };
 for(const f of legacy.fields) {
  if(!["TITLE","DESCRIPTION"].includes(f.origin) || f.field === "contexte_recruteur") continue;
  const s=fold(f.evidence);
  let state: ParsedField["state"] = f.state === "NEGATION" ? "NEGATED" : f.state === "SOUHAITE" ? "DESIRED" : f.state === "EXIGENCE_TEXTE" ? "REQUIRED" : /^(EXPLICITE|CLASSIFICATION_TITRE)$/.test(f.state) ? "REPORTED" : /CONFIRMER|CONDITION|STRUCTURER|INCONNU/.test(f.state) ? "REVIEW_REQUIRED" : "MENTION";
  // A mixed sentence cannot attach one requirement level to all its concepts.
  if(/souhait|apprecie/.test(s) && /exige|obligatoire|indispensable|requis/.test(s)) state="REVIEW_REQUIRED";
  if(f.field === "certification" && /\bou\b/.test(s)) state="REVIEW_REQUIRED";
  if(f.field === "service" && /urgence[s]? vitale|materiel.{0,30}reanimation|chariot.{0,30}reanimation/.test(s)) continue;
  if(f.field === "avantage" && /sans logement|pas de logement|aucun logement/.test(s) && f.value === "LOGEMENT") state="NEGATED";
  if(["service","specialite"].includes(f.field)&&!isJobServiceEvidence(f.evidence,String(f.value)))continue;
  // A service/population label is not a mandatory skill inferred from nearby diploma wording.
  if(["service","specialite","population","equipement"].includes(f.field)&&state==="REQUIRED")state="MENTION";
  if(f.field==="competence"&&state==="REQUIRED"&&/diplome|certification|rpps/.test(s)&&!/maitrise|competences? (?:requises?|obligatoires?)/.test(s))state="MENTION";
  if(f.field === "horaires_detail" && hourPairsFromText(f.evidence).length) continue;
  add(f.field,f.value,f.evidence,f.origin,state);
 }
 for(const origin of ["TITLE", "DESCRIPTION"] as const) {
  const source = origin === "TITLE" ? row.title || "" : row.description || "";
  for(const pair of hourPairsFromText(source)) {
   // Keep alternatives and negations in the original clause, not a decontextualized time pair.
   const context = clauses(source).find(text => text.includes(pair.evidence)) || pair.evidence;
   const value = {start:pair.start,end:pair.end};
   const state = legacy.fields.some((f: {field: string; state: string; evidence: string}) => f.field === "horaires_detail" && f.state === "NEGATION" && f.evidence.includes(pair.evidence)) ? "NEGATED" : "REVIEW_REQUIRED";
   if(result.fields.some(f => f.key === "horaires_detail" && f.evidence.origin === origin && f.state === state && JSON.stringify(f.value) === JSON.stringify(value))) continue;
   add("horaires_detail",value,context,origin,state);
  }
 }
 for(const text of clauses(row.description || "")) {
  const s=fold(text);
  if(/donnees personnelles|cnil|chiffre d.affaires/.test(s)) continue;
  if(/medecine (?:generale|polyvalente)/.test(s)&&isJobServiceEvidence(text,"MEDECINE_POLYVALENTE")) add(/experience/.test(s)?"experience_domaine":"service","MEDECINE_POLYVALENTE",text,"DESCRIPTION","MENTION");
  if(/maternite/.test(s)&&isJobServiceEvidence(text,"MATERNITE")) add("specialite","MATERNITE",text,"DESCRIPTION","MENTION");
  if(/diplome.e?\s+d.etat|diplome.{0,30}infirmier/.test(s) && /infirmier/.test(s) && !result.fields.some(f=>f.key==="certification" && text.includes(f.evidence.text)))
   add("certification","DIPLOME_INFIRMIER",text,"DESCRIPTION",/souhait|apprecie/.test(s) && /exige|obligatoire|requis/.test(s)?"REVIEW_REQUIRED":/exige|obligatoire|vous etes/.test(s)?"REQUIRED":"MENTION");
  const days=[...s.matchAll(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/g)].map(m=>m[1]);
  if(days.length) add("jours_nommes",days,text,"DESCRIPTION","REVIEW_REQUIRED");
  if(/permis\s*b\b/.test(s)) add("permis","B",text,"DESCRIPTION",/sans|pas de/.test(s)?"NEGATED":/obligatoire|exige|indispensable/.test(s)?"REQUIRED":"MENTION");
  if(/logiciel|\bdpi\b|netsoins|osiris|crossway|orbis/.test(s)) add("logiciel",text,text,"DESCRIPTION","MENTION");
  if(/\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(s) && /mission|du |au |debut|fin/.test(s)) add("dates_mission",text,text,"DESCRIPTION","REVIEW_REQUIRED");
  if(/salaire|remuneration|bruts?\s*\/\s*mois/.test(s) && !/chiffre d.affaires/.test(s)) {
   const amounts=[...s.matchAll(/(\d{1,3}(?:[ \u00a0]\d{3})+|\d+)([.,]\d+)?\s*(k)?\s*(?:€|euros?)/g)];
   for(const m of amounts) {
    const amount=Number((m[1] || "").replace(/\s/g,"")+(m[2] || "").replace(",","."))*(m[3]?1000:1);
    const nearby=s.slice(Math.max(0,(m.index || 0)-35),(m.index || 0)+m[0].length+45);
    if(/transport|indemni|repas|rembours/.test(nearby)) continue;
    const unit=/\/\s*h\b|par heure|horaire/.test(nearby)?"HOUR":/mois|mensuel/.test(nearby)?"MONTH":/annuel|par an/.test(nearby)?"YEAR":null;
    const gross=/brut/.test(nearby)?true:/net/.test(nearby)?false:null;
    // Multiple amounts/components remain attached to their full sentence, never chosen as one base salary.
    add("salaire_structure",{amount,currency:"EUR",unit,gross},text,"DESCRIPTION","REVIEW_REQUIRED");
   }
  }
 }
 result.warnings=[...new Set<string>(legacy.alerts)];
 if(new Set(result.fields.filter(f=>f.key==="service").map(f=>JSON.stringify(f.value))).size>1) result.warnings.push("MULTIPLE_SERVICES_MENTIONNES");
 result.reviewQueue=clauses(row.description || "").filter(text=>! /donnees personnelles|cnil|votre cv/.test(fold(text)) && (/\d|permis|logiciel|diplome|experience|horaire|logement|vaccin|contrat/i.test(fold(text)) || !result.fields.some(f=>f.evidence.text.includes(text))));
 return result;
}
export function currentParsedOffer(row: ParserInput & {parsed_offer?: ParsedOffer | null}) {
 return row.parsed_offer?.parserVersion === PARSER_VERSION && row.parsed_offer.inputHash === parserInputHash(row) ? row.parsed_offer : null;
}
