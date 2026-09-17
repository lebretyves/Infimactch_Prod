export type OfferCoordinates = { latitude: number; longitude: number };
type CommuneCentre = { coordinates: OfferCoordinates; commune: string };
type CacheEntry = { value: CommuneCentre | null; expires: number };
const cache = new Map<string, CacheEntry>();
const enriched = new WeakMap<object, CommuneCentre>();
let cooldownUntil = 0;

function numeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^[+-]?\d+(?:[.,]\d+)?$/.test(value.trim()))
    return null;
  const result = Number(value.trim().replace(",", "."));
  return Number.isFinite(result) ? result : null;
}

/** Bounding boxes are a plausibility guard, never proof of an exact workplace. */
export function franceCoordinates(
  latitude: unknown,
  longitude: unknown,
): OfferCoordinates | null {
  const lat = numeric(latitude),
    lon = numeric(longitude);
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180)
    return null;
  const boxes = [
    [41, 51.6, -5.6, 10], // metropolitan France, including Corsica
    [14, 18.2, -63.3, -60], // Antilles
    [2, 6, -55, -51], // Guyane
    [-22, -20, 55, 56], // Reunion
    [-14, -12, 44, 46], // Mayotte
    [46, 48, -57, -55], // Saint-Pierre-et-Miquelon
    [-28, -7, -155, -134], // Polynesie francaise
    [-23, -18, 163, 169], // Nouvelle-Caledonie
    [-15, -13, -179, -175], // Wallis-et-Futuna
  ];
  return boxes.some(
    ([south, north, west, east]) =>
      lat >= south! && lat <= north! && lon >= west! && lon <= east!,
  )
    ? { latitude: lat, longitude: lon }
    : null;
}

export function officialCommuneCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^(?:\d{5}|2[AB]\d{3})$/.test(code) ? code : null;
}

export function offerLocationCoordinates(raw: any) {
  const provider = franceCoordinates(
    raw?.lieuTravail?.latitude,
    raw?.lieuTravail?.longitude,
  );
  if (provider)
    return {
      coordinates: provider,
      precision: "PROVIDER_COORDINATES_UNVERIFIED",
      coordinateSource: "PROVIDER",
    };
  const centre = raw && typeof raw === "object" ? enriched.get(raw) : undefined;
  if (centre)
    return {
      coordinates: centre.coordinates,
      precision: "COMMUNE_CENTRE",
      coordinateSource: "GEO_API_GOUV",
      coordinateCommune: centre.commune,
    };
  return {
    coordinates: null,
    precision: "PROVIDER_LABEL",
    coordinateSource: null,
  };
}

export type GeolocationOptions = {
  transport?: typeof fetch;
  maxRequests?: number;
  requestTimeoutMs?: number;
  budgetMs?: number;
  /** Separate cache for deterministic tests or an isolated import job. */
  cache?: Map<string, CacheEntry>;
};

/** No address/name is sent: only the provider's official INSEE commune code.
 * Keep returned objects until normalizeOffer/importOffers: metadata is deliberately
 * process-local, so it cannot be spoofed by provider JSON or affect its raw hash.
 * Documentation: https://geo.api.gouv.fr/decoupage-administratif/communes
 */
export async function enrichFranceTravailLocations<
  T extends Record<string, any>,
>(rows: T[], options: GeolocationOptions = {}): Promise<T[]> {
  const transport = options.transport ?? fetch,
    store = options.cache ?? cache;
  const maxRequests = Math.max(0, Math.min(100, options.maxRequests ?? 30));
  const timeout = Math.max(1, Math.min(3000, options.requestTimeoutMs ?? 2500));
  const deadline =
    Date.now() + Math.max(1, Math.min(15000, options.budgetMs ?? 10000));
  const codes = [
    ...new Set(
      rows
        .filter(
          (row) =>
            !franceCoordinates(
              row?.lieuTravail?.latitude,
              row?.lieuTravail?.longitude,
            ),
        )
        .map((row) => officialCommuneCode(row?.lieuTravail?.commune))
        .filter((code): code is string => !!code),
    ),
  ];
  const resolved = new Map<string, CommuneCentre | null>();
  let next = 0,
    requests = 0,
    localCooldown = false;
  async function resolve(code: string) {
    const cached = store.get(code);
    if (cached && cached.expires > Date.now()) {
      resolved.set(code, cached.value);
      return;
    }
    if (
      requests >= maxRequests ||
      Date.now() >= deadline ||
      localCooldown ||
      (!options.transport && cooldownUntil > Date.now())
    )
      return;
    requests++;
    let value: CommuneCentre | null = null,
      ttl = 60000;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(timeout, deadline - Date.now()),
    );
    try {
      const response = await transport(
        `https://geo.api.gouv.fr/communes/${code}?fields=code,centre&format=json`,
        { signal: controller.signal, redirect: "error" },
      );
      if (response.status === 429) {
        localCooldown = true;
        if (!options.transport) cooldownUntil = Date.now() + 60000;
        await response.body?.cancel();
      } else if (response.status === 404) {
        ttl = 3600000;
        await response.body?.cancel();
      } else if (response.ok && response.body) {
        const reader = response.body.getReader();
        let size = 0,
          text = "";
        const decoder = new TextDecoder();
        try {
          for (;;) {
            const part = await reader.read();
            if (part.done) break;
            size += part.value.byteLength;
            if (size > 32768) throw new Error("GEOGRAPHY_RESPONSE_TOO_LARGE");
            text += decoder.decode(part.value, { stream: true });
          }
          text += decoder.decode();
        } finally {
          await reader.cancel().catch(() => {});
        }
        const body = JSON.parse(text);
        const point = body?.centre;
        const coordinates =
          point?.type === "Point" &&
          Array.isArray(point.coordinates) &&
          point.coordinates.length === 2
            ? franceCoordinates(point.coordinates[1], point.coordinates[0])
            : null;
        if (body?.code === code && coordinates) {
          value = { commune: code, coordinates };
          ttl = 7 * 86400000;
        }
      } else await response.body?.cancel();
    } catch {
      /* Provider unavailable/unknown stays unknown; never guess an address. */
    } finally {
      clearTimeout(timer);
    }
    if (store.size >= 2000) store.delete(store.keys().next().value!);
    store.set(code, { value, expires: Date.now() + ttl });
    resolved.set(code, value);
  }
  await Promise.all(
    Array.from({ length: Math.min(4, codes.length) }, async () => {
      while (next < codes.length) {
        const code = codes[next++]!;
        await resolve(code);
      }
    }),
  );
  return rows.map((row) => {
    if (
      franceCoordinates(row?.lieuTravail?.latitude, row?.lieuTravail?.longitude)
    )
      return row;
    const code = officialCommuneCode(row?.lieuTravail?.commune),
      centre = code ? resolved.get(code) : null;
    if (!centre) return row;
    const copy = { ...row };
    enriched.set(copy, centre);
    return copy;
  });
}

export function transferOfferLocation<T extends object>(
  from: object,
  to: T,
): T {
  const centre = enriched.get(from);
  if (centre) enriched.set(to, centre);
  return to;
}
export function withCommuneCentre<T extends object>(
  row: T,
  centre: CommuneCentre,
): T {
  const copy = { ...row };
  enriched.set(copy, centre);
  return copy;
}
