/** Fields supplied by GET /listings/e_:id (externalPresentation). */
export const FRANCE_TRAVAIL_DOCUMENTATION_URL = "https://francetravail.io/produits-partages/catalogue/offres-emploi/documentation";
type Provenance = { imported_at?: string; provenance?: {publishedAt?: string | null; sourceUpdatedAt?: string | null}; freshness?: {lastSeenAt?: string | null} };
export function externalProvenanceDates(offer: Provenance) {
 const result: {label:string; iso:string; display:string}[]=[];
 for (const [label,value] of [
  ["Publication chez la source",offer.provenance?.publishedAt],
  ["Mise à jour chez la source",offer.provenance?.sourceUpdatedAt],
  // imported_at is refreshed on an upsert: it is not the first import date.
  ["Dernière observation par InfiMatch",offer.freshness?.lastSeenAt || offer.imported_at],
 ]) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) continue;
  const iso=new Date(value).toISOString();
  result.push({label:label!,iso,display:new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Paris"}).format(new Date(iso))});
 }
 return result;
}
