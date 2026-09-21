import { useEffect, useRef, useState } from "react";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import type { CookiePreferences } from "@/services/cookiePreferences";
import s from "./CookiePreferencesPanel.module.css";
import preferencesStyle from "./SitePreferences.module.css";
type Props = {
  open: boolean;
  preferences: CookiePreferences | null;
  storageNotice: string;
  onOpen: () => void;
  onPolicyNavigate: () => void;
  onSave: (google: boolean) => void;
  onClose: () => void;
};
export function CookiePreferencesPanel({
  open,
  preferences,
  storageNotice,
  onOpen,
  onPolicyNavigate,
  onSave,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [custom, setCustom] = useState(false);
  const [google, setGoogle] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open) {
      setGoogle(preferences?.google === true);
      setCustom(false);
      if (!element.open) {
        const active = document.activeElement;
        returnFocus.current = active instanceof HTMLElement && !element.contains(active)
          ? active : trigger.current;
        element.showModal();
        element.scrollTop = 0;
        title.current?.focus();
      }
    } else if (element.open) element.close();
  }, [open, preferences]);
  const policy =
    import.meta.env.VITE_ROUTER === "hash"
      ? `${import.meta.env.BASE_URL}#/mentions-legales#cookies`
      : `${import.meta.env.BASE_URL}mentions-legales#cookies`;
  return (
    <>
      <button
        ref={trigger}
        className={preferencesStyle.trigger}
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="cookie-preferences"
      >
        <Icon name="settings" size={15} />
        Cookies
      </button>
      {storageNotice && (
        <p className={s.storageNotice} role="status">
          {storageNotice}
        </p>
      )}
      <dialog
        ref={dialog}
        id="cookie-preferences"
        className={s.dialog}
        aria-labelledby="cookie-title"
        aria-describedby="cookie-summary"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClose={() => {
          if (open) onClose();
          const previous = returnFocus.current;
          if (previous) {
            const target = previous !== document.body && previous.isConnected
              ? previous : document.querySelector<HTMLElement>("main h1") ?? document.querySelector<HTMLElement>("main");
            if (target) {
              if (target.matches("h1, main")) target.tabIndex = -1;
              target.focus();
            }
          }
        }}
      >
        <div className={s.heading}>
          <span className={s.icon}>
            <Icon name="lock" size={24} />
          </span>
          <div>
            <p className={s.eyebrow}>Vos préférences</p>
            <h2 id="cookie-title" ref={title} tabIndex={-1}>Cookies et connexion Google</h2>
          </div>
          <button
            className={s.close}
            type="button"
            aria-label="Fermer les préférences cookies"
            onClick={onClose}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <p id="cookie-summary">
          InfiMatch utilise des cookies nécessaires à votre session. La
          connexion Google est facultative : son service se charge uniquement
          avec votre accord.
        </p>
        <p className={s.note}>
          Aucun outil de publicité ou de mesure d’audience n’est intégré.
          Refuser Google ne vous déconnecte pas et vous pouvez continuer avec
          votre adresse e-mail.
        </p>
        <div className={s.actions}>
          <Button type="button" variant="outline" onClick={() => onSave(false)}>
            Tout refuser
          </Button>
          <Button type="button" variant="outline" onClick={() => onSave(true)}>
            Tout accepter
          </Button>
        </div>
        <div className={s.links}>
          <button
            type="button"
            className={s.textButton}
            aria-expanded={custom}
            aria-controls="cookie-categories"
            onClick={() => setCustom(!custom)}
          >
            {custom ? "Masquer le détail" : "Personnaliser mes choix"}
          </button>
          <a
            href={policy}
            onClick={(event) => {
              if (
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey &&
                !event.altKey &&
                event.button === 0
              ) {
                event.preventDefault();
                // Close before navigation so the destination is no longer inert.
                returnFocus.current = null;
                dialog.current?.close();
                onClose();
                onPolicyNavigate();
              } else {
                onClose();
              }
            }}
          >
            Politique des cookies
          </a>
        </div>
        <div id="cookie-categories" className={s.categories} hidden={!custom}>
            <section>
              <div className={s.row}>
                <h3>Nécessaires</h3>
                <span>Toujours actifs</span>
              </div>
              <p>
                Maintien de la session, sécurité, brouillon d’inscription et
                mémorisation de votre choix.
              </p>
            </section>
            <section>
              <label className={s.choice}>
                <input
                  type="checkbox"
                  checked={google}
                  aria-describedby="cookie-google-description"
                  onChange={(event) => setGoogle(event.target.checked)}
                />
                <span>Connexion Google</span>
              </label>
              <p id="cookie-google-description">
                Autorise le service Google Identity Services, fourni par Google,
                à afficher son bouton et à vous identifier. Google peut lire ou
                déposer ses propres cookies.{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Confidentialité Google
                </a>
                .
              </p>
            </section>
            <Button type="button" onClick={() => onSave(google)}>
              Enregistrer mes choix
            </Button>
          </div>
        <p className={s.footnote}>
          Choix conservé six mois sur ce navigateur, modifiable à tout moment
          avec « Cookies ». Retirer l’accord ne supprime pas les cookies déjà
          déposés par Google.
        </p>
      </dialog>
    </>
  );
}
