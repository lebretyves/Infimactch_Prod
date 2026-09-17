import {FranceTravailClient,FT_KEYWORDS,advanceFtQuery,type FtQuery} from "./france-travail-client";
import { parseOffer } from "./offer-parser";
import { guardCrossSourceDuplicates } from "./offer-deduplication";
import {
  offerRetirementReasons,
  permanentContractEvidence,
} from "./contract-policy";
import { createHash } from "node:crypto";
import { Database } from "../database/database";
import { clean, cleanDescription, offerFacts } from "./offer-quality";
export { clean, cleanDescription } from "./offer-quality";
export function normalizeOffer(raw: any, fetchedAt = new Date().toISOString()) {
  if (
    !raw ||
    typeof raw.id !== "string" ||
    !raw.id.match(/^[A-Za-z0-9_-]{1,50}$/)
  )
    throw new Error("INVALID_ID");
  const title = clean(raw.intitule, 150),
    description = cleanDescription(raw.description);
  if (!title || !description) throw new Error("MISSING_CONTENT");
  if (permanentContractEvidence(title, description)) throw new Error("PERMANENT_POSITION_EXCLUDED");
  if (raw.typeContrat !== "MIS") throw new Error("NOT_TEMPORARY_EMPLOYMENT");
  const facts = offerFacts(raw);
  const qualification = facts.qualification;
  const url =
    "https://candidat.francetravail.fr/offres/recherche/detail/" +
    encodeURIComponent(raw.id);
  return {
    source: "FRANCE_TRAVAIL",
    sourceId: raw.id,
    title,
    description,
    url,
    locationLabel: clean(raw.lieuTravail?.libelle, 200) || "Lieu non precise",
    qualification,
    rawHash: createHash("sha256").update(JSON.stringify(raw)).digest("hex"),
    provenance: {
      normalizationVersion: 2,
      facts,
      provider: "FRANCE_TRAVAIL",
      externalId: raw.id,
      sourceUrl: url,
      originalPublisher:
        clean(raw.origineOffre?.origine, 100) || "France Travail / partenaire",
      fetchedAt,
      publishedAt:
        typeof raw.dateCreation === "string" ? raw.dateCreation : null,
      sourceUpdatedAt: typeof raw.dateActualisation === "string" ? raw.dateActualisation : null,
      rawTitle: clean(raw.intitule, 300),
      locationPrecision: facts.location.precision,
      salaryRaw: clean(raw.salaire?.libelle, 300) || null,
      contract: "MIS",
      shift: null,
      missionStart: null,
    },
  };
}
export async function fetchOffers(limit=150,transport:typeof fetch=fetch,department?:string){
 if(!Number.isInteger(limit)||limit<1||limit>150)throw Error('Limit must be between 1 and 150');
 if(department!==undefined&&!/^(?:\d{2}|2A|2B|97\d)$/.test(department))throw Error('Invalid department');
 const client=new FranceTravailClient(transport),queue:FtQuery[]=FT_KEYWORDS.map(keyword=>({keyword,department,start:0})),unique=new Map<string,any>();let requests=0;
 while(queue.length){if(++requests>1024)throw Error('FT_COLLECTION_INCOMPLETE_REQUEST_LIMIT');const query=queue[0]!,page=await client.search(query,limit);const next=advanceFtQuery(query,page);queue.splice(0,1,...next);
  for(const row of page.rows){if(department&&(typeof row.lieuTravail?.commune!=='string'||!row.lieuTravail.commune.startsWith(department)))continue;unique.set(row.id,row);}
 }
 return [...unique.values()];
}
export async function importOffers(db: Database, raw: any[], dryRun: boolean, normalize: (raw: any) => ReturnType<typeof normalizeOffer> & { expiresAt?: string | null } = normalizeOffer, source = "FRANCE_TRAVAIL") {
  const accepted: (ReturnType<typeof normalizeOffer> & { expiresAt?: string | null })[] = [];
  const rejected: { index: number; reason: string }[] = [];
  const seen = new Set<string>();
  for (const [index, item] of raw.entries()) {
    try {
      const offer = normalize(item);
      if (!seen.has(offer.sourceId)) {
        accepted.push(offer);
        seen.add(offer.sourceId);
      }
    } catch (e) {
      rejected.push({ index, reason: (e as Error).message });
    }
  }
  const summary = {
    received: raw.length,
    accepted: accepted.length,
    rejected,
    dryRun,
    source,
    duplicates: [] as { id: string; duplicateOf: string; reason: string }[],
  };
  if (!dryRun)
    await db.transaction(async (em) => {
      // Serialize provider imports, including the duplicate check, across processes.
      await em.query("SELECT pg_advisory_xact_lock(1789380901)");
      // Hide a previously imported offer when this lot proves it is closed, expired or non-compliant.
      // Absence from a bounded import is never treated as disappearance.
      for (const rejection of rejected) {
        const sourceId = raw[rejection.index]?.id;
        if (
          !offerRetirementReasons.has(rejection.reason) ||
          typeof sourceId !== "string"
        )
          continue;
        await em.query(
          "UPDATE external_offer SET active=false, provenance=jsonb_set(coalesce(provenance,'{}'::jsonb), '{retiredReason}', to_jsonb($3::text)) WHERE source=$1 AND source_id=$2 AND active",
          [source, sourceId, rejection.reason],
        );
      }
      // One round trip per page, retaining the same transaction and unique key.
      for (let start = 0; start < accepted.length; start += 150) {
        const batch = accepted.slice(start, start + 150);
        const parameters = batch.flatMap(o => [
          o.source, o.sourceId, o.title, o.description, o.url, o.locationLabel,
          o.qualification, o.rawHash, JSON.stringify(o.provenance), o.expiresAt ?? null,
          JSON.stringify(parseOffer({ ...o, location_label: o.locationLabel })),
        ]);
        const values = batch.map((_, index) => "(" + Array.from({length: 11}, (_, field) => "$" + (index * 11 + field + 1)).join(",") + ")").join(",");
        await em.query(`INSERT INTO external_offer(source,source_id,title,description,url,location_label,qualification,raw_hash,provenance,expires_at,parsed_offer) VALUES ${values} ON CONFLICT(source,source_id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,url=EXCLUDED.url,location_label=EXCLUDED.location_label,qualification=EXCLUDED.qualification,raw_hash=EXCLUDED.raw_hash,provenance=EXCLUDED.provenance || CASE WHEN external_offer.provenance ? 'availabilityCheck' THEN jsonb_build_object('availabilityCheck',external_offer.provenance->'availabilityCheck') ELSE '{}'::jsonb END || CASE WHEN external_offer.provenance->>'retiredReason'='PROVIDER_CLOSED' THEN jsonb_build_object('retiredReason','PROVIDER_CLOSED') ELSE '{}'::jsonb END,expires_at=EXCLUDED.expires_at,parsed_offer=CASE WHEN external_offer.parsed_offer->>'inputHash'=EXCLUDED.parsed_offer->>'inputHash' AND external_offer.parsed_offer->>'parserVersion'=EXCLUDED.parsed_offer->>'parserVersion' THEN external_offer.parsed_offer ELSE EXCLUDED.parsed_offer END,imported_at=now(),active=CASE WHEN external_offer.provenance->>'retiredReason'='PROVIDER_CLOSED' THEN false ELSE true END`, parameters);
      }
      summary.duplicates = await guardCrossSourceDuplicates(em);
      await em.query(
        "INSERT INTO import_run(provider,status,summary) VALUES($2,'SUCCESS',$1)",
        [JSON.stringify(summary), source],
      );
    });
  return summary;
}
