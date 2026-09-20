import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  A11Y_PREFERENCES_KEY,
  applyAccessibilityPreferences,
  clearAccessibilityPreferences,
  defaultAccessibilityPreferences,
  parseAccessibilityPreferences,
  readAccessibilityPreferences,
  storeAccessibilityPreferences,
  type AccessibilityPreferences,
  type TextSizePreference,
} from "@/services/accessibilityPreferences";

type AccessibilityContextValue = {
  preferences: AccessibilityPreferences;
  persisted: boolean;
  setTextSize: (value: TextSizePreference) => void;
  setHighContrast: (value: boolean) => void;
  setReadableFont: (value: boolean) => void;
  setWideSpacing: (value: boolean) => void;
  setUnderlineLinks: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  resetPreferences: () => void;
  openPanel: () => void;
  closePanel: () => void;
  panelOpen: boolean;
};

const Context = createContext<AccessibilityContextValue | undefined>(undefined);

function persist(
  next: Omit<AccessibilityPreferences, "version" | "savedAt">,
): { preferences: AccessibilityPreferences; persisted: boolean } {
  const result = storeAccessibilityPreferences(next);
  applyAccessibilityPreferences(result.preferences);
  return result;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readAccessibilityPreferences);
  const [persisted, setPersisted] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    applyAccessibilityPreferences(preferences);
  }, [preferences]);


  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== A11Y_PREFERENCES_KEY && event.key !== null) return;
      const next =
        parseAccessibilityPreferences(event.newValue) ??
        defaultAccessibilityPreferences();
      applyAccessibilityPreferences(next);
      setPreferences(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback(
    (patch: Partial<Omit<AccessibilityPreferences, "version" | "savedAt">>) => {
      const result = persist({
        textSize: preferences.textSize,
        highContrast: preferences.highContrast,
        readableFont: preferences.readableFont,
        wideSpacing: preferences.wideSpacing,
        underlineLinks: preferences.underlineLinks,
        reduceMotion: preferences.reduceMotion,
        ...patch,
      });
      setPreferences(result.preferences);
      setPersisted(result.persisted);
    },
    [preferences],
  );

  const resetPreferences = useCallback(() => {
    const cleared = clearAccessibilityPreferences();
    const next = defaultAccessibilityPreferences();
    applyAccessibilityPreferences(next);
    setPreferences(next);
    setPersisted(cleared);
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      preferences,
      persisted,
      setTextSize: (textSize) => update({ textSize }),
      setHighContrast: (highContrast) => update({ highContrast }),
      setReadableFont: (readableFont) => update({ readableFont }),
      setWideSpacing: (wideSpacing) => update({ wideSpacing }),
      setUnderlineLinks: (underlineLinks) => update({ underlineLinks }),
      setReduceMotion: (reduceMotion) => update({ reduceMotion }),
      resetPreferences,
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
      panelOpen,
    }),
    [preferences, persisted, update, resetPreferences, panelOpen],
  );

  return <Context value={value}>{children}</Context>;
}

export function useAccessibility() {
  const value = useContext(Context);
  if (!value) throw new Error("AccessibilityProvider absent");
  return value;
}
