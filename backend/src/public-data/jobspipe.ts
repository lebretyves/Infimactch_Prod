import { transferOfferLocation } from "./offer-geolocation";
import {
  interimContractEvidence,
  permanentContractEvidence,
} from "./contract-policy";
import { normalizeOffer } from "./offers";
import { clean, cleanDescription } from "./offer-quality";
import { createHash } from "node:crypto";

export function normalizeJobsPipe(raw: any): ReturnType<typeof normalizeOffer> & { expiresAt: string | null } {
  if (!raw || typeof raw.id !== "string" || !/^[A-Za-z0-9_:-]{1,200}$/.test(raw.id)) throw Error("INVALID_ID");
  if (raw.country_code !== "FR") throw Error("COUNTRY_UNCONFIRMED");
  if (raw.status && raw.status !== "active" && raw.status !== "open") throw Error("OFFER_NOT_ACTIVE");
  if (raw.closed_at) throw Error("OFFER_CLOSED");
  if (raw.expires_at && (!Number.isFinite(Date.parse(raw.expires_at)) || Date.parse(raw.expires_at) <= Date.now())) throw Error("OFFER_EXPIRED");
  const title = clean(raw.job_title, 150), description = cleanDescription(raw.description);
  if (permanentContractEvidence(title, description)) throw Error("PERMANENT_POSITION_EXCLUDED");
  // Temporary/contract also includes CDD: the job itself must be interim, not the recruiting agency.
  if (!interimContractEvidence(title, description)) throw Error("INTERIM_UNCONFIRMED");
  let url: URL;
  try { url = new URL(raw.final_url || raw.source_url || raw.url); } catch { throw Error("INVALID_URL"); }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".") || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)) throw Error("INVALID_URL");
  const offer = normalizeOffer(transferOfferLocation(raw, { id: createHash("sha256").update(raw.id).digest("hex").slice(0, 40), intitule: title, description, typeContrat: "MIS", lieuTravail: { libelle: raw.location, latitude: raw.latitude, longitude: raw.longitude, codePostal: raw.postal_code }, salaire: { libelle: raw.salary_string }, dateCreation: raw.date_posted }));
  if (!offer.qualification) throw Error("NURSING_QUALIFICATION_UNCONFIRMED");
  return { ...offer, expiresAt: raw.expires_at ? new Date(raw.expires_at).toISOString() : null, source: "JOBSPIPE", sourceId: raw.id, url: url.href,
    rawHash: createHash("sha256").update(JSON.stringify(raw)).digest("hex"),
    provenance: { ...offer.provenance, provider: "JOBSPIPE", externalId: raw.id, sourceUrl: url.href, originalPublisher: "JobsPipe", facts: { ...offer.provenance.facts, providerClassification: { code: clean(raw.occupation_code, 20) || null, label: clean(raw.occupation_label, 200) || null, reference: "ISCO-08" } }, contract: "INTERIM_CONTEXT_CONFIRMED" } };
}

export async function fetchJobsPipe(limit = 10, transport: typeof fetch = fetch) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw Error("JobsPipe Free limit must be 1-25");
  const key = process.env.JOBSPIPE_API_KEY;
  if (!key) throw Error("JOBSPIPE_API_KEY missing: configure Vault first");
  const res = await transport("https://api.jobspipe.dev/v1/jobs/search", {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ job_title_or: ["infirmier", "infirmiere", "infirmière", "IADE", "IBODE"], job_country_code_or: ["FR"], description_or: ["intérim", "interim"], limit }),
  });
  if (!res.ok) throw Error("JobsPipe HTTP " + res.status + ({401: " (invalid key)",402: " (quota exhausted)",429: " (rate limited)"}[res.status] || ""));
  const result: any = await res.json();
  if (!Array.isArray(result.data) || result.data.length > limit) throw Error("Unexpected JobsPipe response");
  return result.data;
}
