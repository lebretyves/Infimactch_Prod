import { createHash } from "node:crypto";

type Offer = { id: string; source: string; title: string; description: string; url: string; location_label: string; qualification: string | null };
const normalized = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
export function duplicateKeys(o: Offer): string[] {
  const keys: string[] = [];
  try {
    const url = new URL(o.url);
    url.hash = "";
    for (const key of [...url.searchParams.keys()])
      if (/^(utm_.*|gclid|fbclid)$/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    // Only a job-detail URL is evidence; shared home/search pages are not.
    if (/\/offres\/recherche\/detail\/[a-z0-9_-]+\/?$/i.test(url.pathname) && /(^|\.)francetravail\.fr$/.test(url.hostname))
      keys.push("ft:" + url.pathname.split("/").filter(Boolean).pop());
    else if (url.pathname.split("/").filter(Boolean).length >= 2)
      keys.push("url:" + JSON.stringify([url.href, normalized(o.title), normalized(o.location_label), o.qualification]));
  } catch { /* Invalid URLs cannot establish identity. */ }
  const description = normalized(o.description), location = normalized(o.location_label);
  if (description.length >= 200 && location && !/^lieu non pr/.test(location) && o.qualification)
    keys.push("text:" + createHash("sha256").update(JSON.stringify([normalized(o.title), description, location, o.qualification])).digest("hex"));
  return keys;
}
export function findCrossSourceDuplicates(rows: Offer[]) {
  const seen = new Map<string, Offer[]>();
  const duplicates: { id: string; duplicateOf: string; reason: string }[] = [];
  // Prefer the direct France Travail record, then a stable identifier.
  for (const row of [...rows].sort((a,b) => Number(b.source === "FRANCE_TRAVAIL") - Number(a.source === "FRANCE_TRAVAIL") || a.id.localeCompare(b.id))) {
    const keys = duplicateKeys(row);
    const match = keys.map(key => ({ key, offer: seen.get(key)?.find(other => other.source !== row.source) })).find(x => x.offer);
    if (match?.offer) duplicates.push({ id: row.id, duplicateOf: match.offer.id, reason: match.key.startsWith("text:") ? "EXACT_CONTENT_AND_LOCATION" : "SAME_SOURCE_URL" });
    else for (const key of keys) seen.set(key, [...(seen.get(key) || []), row]);
  }
  return duplicates;
}
export async function guardCrossSourceDuplicates(em: { query: (sql: string, args?: any[]) => Promise<any> }) {
  const rows = await em.query("SELECT id,source,title,description,url,location_label,qualification FROM external_offer WHERE active AND (expires_at IS NULL OR expires_at > now()) AND source IN ('FRANCE_TRAVAIL','JOBSPIPE') ORDER BY id FOR UPDATE");
  const duplicates = findCrossSourceDuplicates(rows);
  for (const duplicate of duplicates)
    await em.query("UPDATE external_offer SET active=false, provenance=provenance || jsonb_build_object('deduplication', $2::jsonb) WHERE id=$1", [duplicate.id, JSON.stringify({ ...duplicate, version: 1 })]);
  return duplicates;
}
