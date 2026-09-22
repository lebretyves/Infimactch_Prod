export type GeoPoint = { latitude: number; longitude: number };
export type MapsEndpoint = GeoPoint | { address: string };

function readPoint(value: { latitude?: number | null; longitude?: number | null } | null | undefined): GeoPoint | null {
  if (!value) return null;
  if (value.latitude === null || value.latitude === undefined || String(value.latitude).trim() === '') return null;
  if (value.longitude === null || value.longitude === undefined || String(value.longitude).trim() === '') return null;
  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && Number.isFinite(longitude) && Math.abs(longitude) <= 180
    ? { latitude, longitude }
    : null;
}

export function isGeoPoint(value: { latitude?: number | null; longitude?: number | null } | null | undefined): value is GeoPoint {
  return readPoint(value) !== null;
}

export function mapsEndpoint(
  point: { latitude?: number | null; longitude?: number | null } | null | undefined,
  address?: string | null,
): MapsEndpoint | null {
  const coords = readPoint(point);
  if (coords) return coords;
  const text = typeof address === 'string' ? address.trim() : '';
  return text ? { address: text } : null;
}

function endpointParam(value: MapsEndpoint): string {
  return 'address' in value
    ? value.address
    : `${value.latitude},${value.longitude}`;
}

/** Opens Google Maps directions in a new tab. Link-only — no Maps API key. */
export function googleMapsDirectionsUrl(origin: MapsEndpoint, destination: MapsEndpoint): string {
  const params = new URLSearchParams({
    api: '1',
    origin: endpointParam(origin),
    destination: endpointParam(destination),
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
