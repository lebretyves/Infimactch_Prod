import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  COOKIE_PREFERENCES_KEY,
  consentExpiry,
  parseCookiePreferences,
  readCookiePreferences,
  storeCookiePreferences,
  type CookiePreferences,
} from "@/services/cookiePreferences";
import { setGoogleIdentityPermission } from "@/services/googleIdentity";
import { CookiePreferencesPanel } from "@/components/CookiePreferencesPanel";
type ConsentContext = {
  googleAllowed: boolean;
  preferences: CookiePreferences | null;
  openPreferences: () => void;
  savePreferences: (google: boolean) => void;
};
const Context = createContext<ConsentContext | undefined>(undefined);
export function CookieConsentProvider({
  children,
  onPolicyNavigate,
}: {
  children: ReactNode;
  onPolicyNavigate: () => void;
}) {
  const [preferences, setPreferences] = useState(readCookiePreferences);
  const [open, setOpen] = useState(() => !readCookiePreferences());
  const [storageNotice, setStorageNotice] = useState("");
  const googleAllowed = preferences?.google === true;
  const savePreferences = useCallback((google: boolean) => {
    const result = storeCookiePreferences(google);
    setGoogleIdentityPermission(google);
    setPreferences(result.preferences);
    setStorageNotice(
      result.persisted
        ? ""
        : "Votre choix s’applique à cette visite. Le navigateur empêche sa mémorisation.",
    );
    setOpen(false);
  }, []);
  const openPreferences = useCallback(() => setOpen(true), []);
  useEffect(() => {
    setGoogleIdentityPermission(googleAllowed);
  }, [googleAllowed]);
  useEffect(() => {
    function storage(event: StorageEvent) {
      if (event.key !== COOKIE_PREFERENCES_KEY && event.key !== null) return;
      const next = parseCookiePreferences(event.newValue);
      setGoogleIdentityPermission(next?.google === true);
      setPreferences(next);
      setOpen(!next);
    }
    window.addEventListener("storage", storage);
    return () => window.removeEventListener("storage", storage);
  }, []);
  useEffect(() => {
    if (!preferences) return;
    let timeout: number;
    function checkExpiry() {
      window.clearTimeout(timeout);
      const remaining = consentExpiry(preferences!.savedAt) - Date.now();
      if (remaining <= 0) {
        setGoogleIdentityPermission(false);
        setPreferences(null);
        setOpen(true);
      } else
        timeout = window.setTimeout(
          checkExpiry,
          Math.min(remaining, 2147483647),
        );
    }
    checkExpiry();
    window.addEventListener("focus", checkExpiry);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("focus", checkExpiry);
    };
  }, [preferences]);
  return (
    <Context
      value={{ googleAllowed, preferences, openPreferences, savePreferences }}
    >
      {children}
      <CookiePreferencesPanel
        open={open}
        preferences={preferences}
        storageNotice={storageNotice}
        onOpen={openPreferences}
        onPolicyNavigate={onPolicyNavigate}
        onSave={savePreferences}
        onClose={() => (preferences ? setOpen(false) : savePreferences(false))}
      />
    </Context>
  );
}
export function useCookieConsent() {
  const value = useContext(Context);
  if (!value) throw new Error("CookieConsentProvider absent");
  return value;
}
