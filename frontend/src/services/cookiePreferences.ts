export const COOKIE_PREFERENCES_KEY = "infimatch:cookie-preferences";
export const COOKIE_PREFERENCES_VERSION = 1;
export type CookiePreferences = {
  version: number;
  savedAt: string;
  google: boolean;
};
export function consentExpiry(savedAt: string): number {
  const date = new Date(savedAt);
  date.setUTCMonth(date.getUTCMonth() + 6);
  return date.getTime();
}
export function parseCookiePreferences(
  raw: string | null,
  now = Date.now(),
): CookiePreferences | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<CookiePreferences>;
    if (
      record.version !== COOKIE_PREFERENCES_VERSION ||
      typeof record.google !== "boolean" ||
      typeof record.savedAt !== "string"
    )
      return null;
    const saved = Date.parse(record.savedAt);
    if (
      !Number.isFinite(saved) ||
      saved > now ||
      consentExpiry(record.savedAt) <= now
    )
      return null;
    return record as CookiePreferences;
  } catch {
    return null;
  }
}
export function readCookiePreferences(): CookiePreferences | null {
  try {
    return parseCookiePreferences(localStorage.getItem(COOKIE_PREFERENCES_KEY));
  } catch {
    return null;
  }
}
export function storeCookiePreferences(google: boolean): {
  preferences: CookiePreferences;
  persisted: boolean;
} {
  const preferences: CookiePreferences = {
    version: COOKIE_PREFERENCES_VERSION,
    savedAt: new Date().toISOString(),
    google,
  };
  try {
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
    return { preferences, persisted: true };
  } catch {
    return { preferences, persisted: false };
  }
}
