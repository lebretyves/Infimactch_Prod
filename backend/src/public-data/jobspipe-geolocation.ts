import {
  franceCoordinates,
  officialCommuneCode,
  withCommuneCentre,
  type OfferCoordinates,
} from "./offer-geolocation";
type Centre = { coordinates: OfferCoordinates; commune: string };
type Entry = { value: Centre | null; expires: number };
const cache = new Map<string, Entry>();
let cooldownUntil = 0;
const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[’'\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Only a postal code is sent to the official API, never a job/address or provider URL.
 * Require a unique exact town match within the official postal-code result. */
export async function enrichJobsPipeLocations<T extends Record<string, any>>(
  rows: T[],
  options: {
    transport?: typeof fetch;
    maxRequests?: number;
    budgetMs?: number;
    requestTimeoutMs?: number;
    cache?: Map<string, Entry>;
  } = {},
): Promise<T[]> {
  const transport = options.transport ?? fetch,
    store = options.cache ?? cache;
  const deadline =
    Date.now() + Math.max(1, Math.min(15000, options.budgetMs ?? 10000));
  const maxRequests = Math.max(0, Math.min(100, options.maxRequests ?? 30));
  const timeout = Math.max(1, Math.min(3000, options.requestTimeoutMs ?? 2500));
  const result: T[] = [];
  let requests = 0,
    localCooldown = false;
  for (const row of rows) {
    const postal =
      typeof row.postal_code === "string" ? row.postal_code.trim() : "";
    const label = typeof row.location === "string" ? row.location.trim() : "";
    if (
      row.country_code !== "FR" ||
      franceCoordinates(row.latitude, row.longitude) ||
      !/^\d{5}$/.test(postal) ||
      !label ||
      label.length > 120
    ) {
      result.push(row);
      continue;
    }
    const town = fold(label),
      key = `postal:${postal}:${town}`;
    let entry = store.get(key);
    if (!entry || entry.expires <= Date.now()) {
      if (
        requests >= maxRequests ||
        Date.now() >= deadline ||
        localCooldown ||
        (!options.transport && cooldownUntil > Date.now())
      ) {
        result.push(row);
        continue;
      }
      requests++;
      let value: Centre | null = null,
        ttl = 60000;
      const controller = new AbortController(),
        timer = setTimeout(
          () => controller.abort(),
          Math.min(timeout, deadline - Date.now()),
        );
      try {
        const response = await transport(
          `https://geo.api.gouv.fr/communes?codePostal=${postal}&fields=code,nom,centre,codesPostaux&format=json`,
          { signal: controller.signal, redirect: "error" },
        );
        if (response.status === 429) {
          localCooldown = true;
          if (!options.transport) cooldownUntil = Date.now() + 60000;
        }
        if (response.ok && response.body) {
          const reader = response.body.getReader(),
            decoder = new TextDecoder();
          let text = "",
            size = 0;
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
          const matches = Array.isArray(body)
            ? body.filter(
                (item) =>
                  typeof item?.nom === "string" &&
                  fold(item.nom) === town &&
                  Array.isArray(item.codesPostaux) &&
                  item.codesPostaux.includes(postal),
              )
            : [];
          ttl = 3600000;
          if (matches.length === 1) {
            const item = matches[0],
              code = officialCommuneCode(item.code),
              point = item.centre;
            const coordinates =
              point?.type === "Point" &&
              Array.isArray(point.coordinates) &&
              point.coordinates.length === 2
                ? franceCoordinates(point.coordinates[1], point.coordinates[0])
                : null;
            if (code && coordinates) {
              value = { commune: code, coordinates };
              ttl = 7 * 86400000;
            }
          }
        } else await response.body?.cancel();
      } catch {
        /* Ambiguous or unavailable locality stays unknown. */
      } finally {
        clearTimeout(timer);
      }
      entry = { value, expires: Date.now() + ttl };
      if (store.size >= 2000) store.delete(store.keys().next().value!);
      store.set(key, entry);
    }
    result.push(entry.value ? withCommuneCentre(row, entry.value) : row);
  }
  return result;
}
