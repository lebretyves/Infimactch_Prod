import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { api, ApiError } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useCookieConsent } from "@/context/CookieConsentContext";
import {
  isGoogleIdentityAllowed,
  loadGoogleIdentity,
} from "@/services/googleIdentity";
import { Button } from "@/ui/Button";
import s from "./GoogleConnexion.module.css";
export function GoogleConnexion({
  password = "",
  mode = "signin",
  onClosureComplete,
}: {
  password?: string;
  mode?: "signin" | "signup" | "closure";
  onClosureComplete?: () => void;
}) {
  const completeRef = useRef(onClosureComplete);
  completeRef.current = onClosureComplete;
  const target = useRef<HTMLDivElement>(null);
  const passwordRef = useRef(password);
  const pending = useRef(false);
  passwordRef.current = password;
  const { refresh } = useAuth();
  const { googleAllowed, savePreferences, openPreferences } =
    useCookieConsent();
  const navigate = useNavigate();
  const location = useLocation();
  const next = location.state?.from;
  const search = location.pathname === "/inscription" ? location.search : "";
  const [linkRequired, setLinkRequired] = useState(false);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!googleAllowed) {
      setError("");
      setLinkRequired(false);
    }
  }, [googleAllowed]);
  useEffect(() => {
    let active = true;
    let resizeObserver: ResizeObserver | undefined;
    const controller = new AbortController();
    const element = target.current;
    setReady(false);
    setBusy(false);
    element?.replaceChildren();
    async function prepare() {
      try {
        const config = await api<{ enabled: boolean; clientId: string | null }>(
          "/auth/google/config",
          { signal: controller.signal },
        );
        if (!active) return;
        setEnabled(config.enabled && !!config.clientId);
        if (
          !config.enabled ||
          !config.clientId ||
          !googleAllowed ||
          !isGoogleIdentityAllowed()
        )
          return;
        await loadGoogleIdentity();
        if (!active || !isGoogleIdentityAllowed()) return;
        const { nonce } = await api<{ nonce: string }>(
          mode === "closure" ? "/me/closure-request/google/challenge" : "/auth/google/challenge",
          { method: "POST", signal: controller.signal },
        );
        if (
          !active ||
          !target.current ||
          !window.google ||
          !isGoogleIdentityAllowed()
        )
          return;
        window.google.accounts.id.initialize({
          client_id: config.clientId,
          nonce,
          auto_select: false,
          callback: async ({ credential }) => {
            if (!active || pending.current || !isGoogleIdentityAllowed())
              return;
            pending.current = true;
            setBusy(true);
            setError("");
            setLinkRequired(false);
            try {
              const result = await api<{ registrationRequired?: boolean }>(
                mode === "closure" ? "/me/closure-request/google" : "/auth/google",
                {
                  method: "POST",
                  signal: controller.signal,
                  body: {
                    ...(mode === "closure" ? { confirmed: true } : {}),
                    credential,
                    nonce,
                    ...(passwordRef.current
                      ? { password: passwordRef.current }
                      : {}),
                  },
                },
              );
              if (!active || !isGoogleIdentityAllowed()) return;
              if (mode === "closure") { completeRef.current?.(); return; }
              passwordRef.current = "";
              if (result.registrationRequired) {
                const params = new URLSearchParams(search);
                params.set("google", "1");
                navigate(`/inscription?${params.toString()}`, {
                  replace: true,
                });
              } else {
                await refresh();
                if (!active || !isGoogleIdentityAllowed()) return;
                navigate(
                  typeof next === "string" &&
                    next.startsWith("/") &&
                    !next.startsWith("//")
                    ? next
                    : "/accueil",
                  { replace: true },
                );
              }
            } catch (e) {
              if (
                active &&
                !controller.signal.aborted &&
                isGoogleIdentityAllowed()
              ) {
                setError((e as Error).message);
                setLinkRequired(
                  e instanceof ApiError && e.code === "GOOGLE_LINK_REQUIRED",
                );
                setVersion((v) => v + 1);
              }
            } finally {
              pending.current = false;
              if (active) setBusy(false);
            }
          },
        });
        const buttonTarget = target.current;
        let previousWidth = 0;
        const render = () => {
          if (!active || !isGoogleIdentityAllowed()) return;
          const width = Math.min(400, Math.floor(buttonTarget.clientWidth));
          if (width <= 0 || width === previousWidth) return;
          previousWidth = width;
          buttonTarget.replaceChildren();
          window.google?.accounts.id.renderButton(buttonTarget, {
            theme: "outline",
            size: "large",
            text: mode === "signup" ? "signup_with" : "signin_with",
            width: String(width),
          });
        };
        render();
        resizeObserver = new ResizeObserver(render);
        resizeObserver.observe(buttonTarget);
        setReady(true);
      } catch (e) {
        if (
          active &&
          !controller.signal.aborted &&
          (!googleAllowed || isGoogleIdentityAllowed())
        )
          setError((e as Error).message);
      }
    }
    void prepare();
    return () => {
      active = false;
      controller.abort();
      resizeObserver?.disconnect();
      pending.current = false;
      element?.replaceChildren();
    };
  }, [navigate, refresh, version, next, mode, search, googleAllowed]);
  return (
    <section
      className={s.section}
      aria-label={
        mode === "closure" ? "Confirmer la clôture avec Google" : mode === "signup" ? "Inscription avec Google" : "Connexion avec Google"
      }
      hidden={!enabled && !error}
      aria-busy={busy}
    >
      {enabled && !googleAllowed ? (
        <div className={s.permission}>
          <p>
            <strong>La connexion Google est désactivée.</strong>
          </p>
          <p>
            Pour l’utiliser, autorisez le service Google à charger son bouton et
            ses cookies.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => savePreferences(true)}
          >
            Autoriser la connexion Google
          </Button>
          <button
            type="button"
            className={s.preferences}
            onClick={openPreferences}
          >
            Voir mes préférences cookies
          </button>
        </div>
      ) : (
        enabled && (
          <p>
            {mode === "closure" ? "Confirmez avec le compte Google associé à InfiMatch pour envoyer votre demande de clôture. Votre compte Google ne sera pas supprimé." : mode === "signup"
              ? "Commencez avec Google, puis complétez votre profil. Aucun mot de passe InfiMatch à créer."
              : "Connectez-vous avec Google ou commencez votre inscription."}
          </p>
        )
      )}
      <div
        ref={target}
        className={s.googleButton}
        hidden={!googleAllowed}
        inert={busy || !ready || !googleAllowed}
        style={
          busy || !ready ? { pointerEvents: "none", opacity: 0.6 } : undefined
        }
      />
      {busy && <p role="status">Vérification de votre compte Google…</p>}
      {error && <p role="alert">{error}</p>}
      {linkRequired &&
        (mode === "signup" ? (
          <p>
            <Link to="/connexion">Associer Google à mon compte existant</Link> :
            saisissez votre mot de passe InfiMatch sur la page de connexion,
            puis cliquez sur Google.
          </p>
        ) : (
          <p>
            Saisissez votre mot de passe InfiMatch dans le champ ci-dessus, puis
            cliquez à nouveau sur Google pour associer les deux comptes.
          </p>
        ))}
      {error && !ready && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setError("");
            setVersion((v) => v + 1);
          }}
        >
          Réessayer Google
        </Button>
      )}
    </section>
  );
}
