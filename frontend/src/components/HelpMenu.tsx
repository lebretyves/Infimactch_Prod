import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { Icon } from "@/ui/Icon";
import { useCookieConsent } from "@/context/CookieConsentContext";
import s from "./HelpMenu.module.css";

export function HelpMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const { openPreferences } = useCookieConsent();
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      ref={root}
      className={s.root}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={toggle}
        type="button"
        className={s.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        Aide
        <svg className={s.chevron} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <ul id={panelId} className={s.panel} hidden={!open}>
        <li>
          <Link to="/aide" className={s.item} onClick={() => setOpen(false)}>
            <Icon name="file-text" size={18} />
            Centre d’aide
          </Link>
        </li>
        <li>
          <button
            type="button"
            className={s.item}
            aria-haspopup="dialog"
            aria-controls="cookie-preferences"
            onClick={() => {
              // The cookie dialog returns focus to whatever was focused when it opened.
              toggle.current?.focus();
              setOpen(false);
              openPreferences();
            }}
          >
            <Icon name="lock" size={18} />
            Préférences cookies
          </button>
        </li>
      </ul>
    </div>
  );
}
