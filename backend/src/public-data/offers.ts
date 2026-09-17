import { parseOffer } from "./offer-parser";
import { guardCrossSourceDuplicates } from "./offer-deduplication";
import {
  offerRetirementReasons,
  permanentContractEvidence,
} from "./contract-policy";
import { createHash } from "node:crypto";
import { Database } from "../database/database";
import { clean, offerFacts } from "./offer-quality";
export { clean } from "./offer-quality";
export function normalizeOffer(raw: any, fetchedAt = new Date().toISOString()) {
  if (
    !raw ||
    typeof raw.id !== "string" ||
    !raw.id.match(/^[A-Za-z0-9_-]{1,50}$/)
  )
    throw new Error("INVALID_ID");
  const title = clean(raw.intitule, 150),
    description = clean(raw.description, 8000);
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
      locationPrecision: "PROVIDER_LABEL",
      salaryRaw: clean(raw.salaire?.libelle, 300) || null,
      contract: "MIS",
      shift: null,
      missionStart: null,
    },
  };
}
export async function fetchOffers(
  limit = 50,
  transport: typeof fetch = fetch,
  department?: string,
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 150)
    throw new Error("Limit must be between 1 and 150");
  if (department !== undefined && !/^(?:\d{2}|2A|2B|97\d)$/.test(department))
    throw new Error("Invalid department");
  const id = process.env.FT_CLIENT_ID,
    secret = process.env.FT_CLIENT_SECRET;
  if (!id || !secret)
    throw new Error(
      "France Travail credentials missing; no real acquisition performed",
    );
  const token = await transport(
    "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: id,
        client_secret: secret,
        scope: "api_offresdemploiv2 o2dsoffre",
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!token.ok) throw new Error("France Travail authentication unavailable");
  const auth: any = await token.json();
  if (typeof auth.access_token !== "string")
    throw new Error("Invalid token response");
  const unique = new Map<string, any>();
  // Bounded batch: limit per keyword, not an exhaustive snapshot.
  for (const keyword of ["infirmier", "IDE", "IADE", "IBODE"]) {
    const url = new URL(
      "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search",
    );
    url.searchParams.set("motsCles", keyword);
    if (department) url.searchParams.set("departement", department);
    url.searchParams.set("typeContrat", "MIS");
    url.searchParams.set("range", "0-" + (limit - 1));
    const res = await transport(url, {
      headers: {
        Authorization: "Bearer " + auth.access_token,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 204) continue;
    if (!res.ok)
      throw new Error(
        "France Travail search unavailable (HTTP " + res.status + ")",
      );
    const data: any = await res.json();
    if (!Array.isArray(data.resultats) || data.resultats.length > limit)
      throw new Error("Unexpected offer response");
    for (const offer of data.resultats) {
      if (
        !offer ||
        typeof offer.id !== "string" ||
        !/^[A-Za-z0-9_-]{1,50}$/.test(offer.id)
      )
        throw new Error("Unexpected offer identifier");
      if (department) {
        const commune = offer.lieuTravail?.commune;
        if (typeof commune !== "string" || !commune.startsWith(department))
          continue;
      }
      if (!unique.has(offer.id)) unique.set(offer.id, offer);
    }
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
      for (const o of accepted)
        await em.query(
          `INSERT INTO external_offer(source,source_id,title,description,url,location_label,qualification,raw_hash,provenance,expires_at,parsed_offer) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(source,source_id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,url=EXCLUDED.url,location_label=EXCLUDED.location_label,qualification=EXCLUDED.qualification,raw_hash=EXCLUDED.raw_hash,provenance=EXCLUDED.provenance,expires_at=EXCLUDED.expires_at,parsed_offer=CASE WHEN external_offer.parsed_offer->>'inputHash'=EXCLUDED.parsed_offer->>'inputHash' AND external_offer.parsed_offer->>'parserVersion'=EXCLUDED.parsed_offer->>'parserVersion' THEN external_offer.parsed_offer ELSE EXCLUDED.parsed_offer END,imported_at=now(),active=true`,
          [
            o.source,
            o.sourceId,
            o.title,
            o.description,
            o.url,
            o.locationLabel,
            o.qualification,
            o.rawHash,
            JSON.stringify(o.provenance),
            o.expiresAt ?? null,
            JSON.stringify(parseOffer({ ...o, location_label: o.locationLabel })),
          ],
        );
      summary.duplicates = await guardCrossSourceDuplicates(em);
      await em.query(
        "INSERT INTO import_run(provider,status,summary) VALUES($2,'SUCCESS',$1)",
        [JSON.stringify(summary), source],
      );
    });
  return summary;
}
