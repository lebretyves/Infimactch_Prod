import { applyTextScale } from "@/services/textScale";

export const A11Y_PREFERENCES_KEY = "infimatch:a11y-preferences";
export const A11Y_PREFERENCES_VERSION = 1;

export type TextSizePreference = "normal" | "large" | "xlarge";

export type AccessibilityPreferences = {
  version: number;
  savedAt: string;
  textSize: TextSizePreference;
  highContrast: boolean;
  readableFont: boolean;
  wideSpacing: boolean;
  underlineLinks: boolean;
  reduceMotion: boolean;
};

export const defaultAccessibilityPreferences = (): AccessibilityPreferences => ({
  version: A11Y_PREFERENCES_VERSION,
  savedAt: new Date().toISOString(),
  textSize: "normal",
  highContrast: false,
  readableFont: false,
  wideSpacing: false,
  underlineLinks: false,
  reduceMotion: false,
});

function isTextSize(value: unknown): value is TextSizePreference {
  return value === "normal" || value === "large" || value === "xlarge";
}

export function parseAccessibilityPreferences(
  raw: string | null,
): AccessibilityPreferences | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<AccessibilityPreferences>;
    if (
      record.version !== A11Y_PREFERENCES_VERSION ||
      typeof record.savedAt !== "string" ||
      !isTextSize(record.textSize) ||
      typeof record.highContrast !== "boolean" ||
      typeof record.readableFont !== "boolean" ||
      typeof record.wideSpacing !== "boolean" ||
      typeof record.underlineLinks !== "boolean" ||
      typeof record.reduceMotion !== "boolean"
    )
      return null;
    if (!Number.isFinite(Date.parse(record.savedAt))) return null;
    return record as AccessibilityPreferences;
  } catch {
    return null;
  }
}

export function readAccessibilityPreferences(): AccessibilityPreferences {
  try {
    return (
      parseAccessibilityPreferences(
        localStorage.getItem(A11Y_PREFERENCES_KEY),
      ) ?? defaultAccessibilityPreferences()
    );
  } catch {
    return defaultAccessibilityPreferences();
  }
}

export function storeAccessibilityPreferences(
  next: Omit<AccessibilityPreferences, "version" | "savedAt">,
): { preferences: AccessibilityPreferences; persisted: boolean } {
  const preferences: AccessibilityPreferences = {
    ...next,
    version: A11Y_PREFERENCES_VERSION,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(A11Y_PREFERENCES_KEY, JSON.stringify(preferences));
    return { preferences, persisted: true };
  } catch {
    return { preferences, persisted: false };
  }
}

export function clearAccessibilityPreferences(): boolean {
  try {
    localStorage.removeItem(A11Y_PREFERENCES_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Apply preference attributes on <html> for CSS hooks. */
export function applyAccessibilityPreferences(
  preferences: AccessibilityPreferences,
) {
  const root = document.documentElement;
  root.dataset.a11yText = preferences.textSize;
  root.dataset.a11yContrast = preferences.highContrast ? "high" : "default";
  root.dataset.a11yFont = preferences.readableFont ? "readable" : "default";
  root.dataset.a11ySpacing = preferences.wideSpacing ? "wide" : "default";
  root.dataset.a11yLinks = preferences.underlineLinks ? "underline" : "default";
  root.dataset.a11yMotion = preferences.reduceMotion ? "reduce" : "default";
  applyTextScale(preferences.textSize);
}
