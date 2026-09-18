import { useEffect, useRef, useState } from "react";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Checkbox, Radio } from "@/ui/Choice";
import { useAccessibility } from "@/context/AccessibilityContext";
import type { TextSizePreference } from "@/services/accessibilityPreferences";
import {
  isSpeechSynthesisAvailable,
  pageTextForSpeech,
  selectionTextForSpeech,
  speakText,
  stopSpeech,
} from "@/services/pageSpeech";
import s from "./AccessibilityPanel.module.css";

const textSizes: { value: TextSizePreference; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Grand" },
  { value: "xlarge", label: "Très grand" },
];

export function AccessibilityPanel() {
  const {
    preferences,
    persisted,
    panelOpen,
    openPanel,
    closePanel,
    setTextSize,
    setHighContrast,
    setReadableFont,
    setWideSpacing,
    setUnderlineLinks,
    setReduceMotion,
    resetPreferences,
  } = useAccessibility();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [speaking, setSpeaking] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [speechMessage, setSpeechMessage] = useState("");
  const speechSupported = isSpeechSynthesisAvailable();
  const showSpeechBar = selectionMode || speaking;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (panelOpen) {
      if (!element.open) element.showModal();
    } else if (element.open) element.close();
  }, [panelOpen]);

  useEffect(() => {
    return () => stopSpeech();
  }, []);

  function finishSpeech() {
    setSpeaking(false);
    setSpeechMessage((current) =>
      current.startsWith("Lecture") ? "Lecture terminée." : current,
    );
  }

  function startSpeech(text: string, status: string) {
    const result = speakText(text, finishSpeech);
    if (!result.ok) {
      setSpeechMessage(result.reason);
      setSpeaking(false);
      return false;
    }
    setSpeaking(true);
    setSpeechMessage(status);
    return true;
  }

  function readPage() {
    setSpeechMessage("");
    startSpeech(pageTextForSpeech(), "Lecture du contenu principal en cours…");
  }

  function armSelectionMode() {
    setSpeechMessage(
      "Panneau fermé : sélectionnez du texte sur la page, puis appuyez sur « Lire ».",
    );
    setSelectionMode(true);
    closePanel();
  }

  function readSelectionFromBar() {
    const text = selectionTextForSpeech();
    if (!text) {
      setSpeechMessage(
        "Aucune sélection. Surlignez du texte sur la page, puis appuyez sur « Lire ».",
      );
      return;
    }
    startSpeech(text, "Lecture de la sélection en cours…");
  }

  function stopReading() {
    stopSpeech();
    setSpeaking(false);
    setSpeechMessage("Lecture arrêtée.");
  }

  function dismissSelectionMode() {
    stopSpeech();
    setSpeaking(false);
    setSelectionMode(false);
    setSpeechMessage("");
  }

  function handleClose() {
    closePanel();
  }

  return (
    <>
      <button
        ref={trigger}
        className={s.trigger}
        type="button"
        onClick={openPanel}
        aria-haspopup="dialog"
        aria-expanded={panelOpen}
        aria-controls="a11y-preferences"
      >
        <Icon name="eye" size={15} />
        Accessibilité
      </button>

      {showSpeechBar && (
        <div className={s.speechBar} role="region" aria-label="Lecture vocale">
          <p className={s.speechBarText} role="status">
            {speechMessage ||
              (selectionMode
                ? "Sélectionnez du texte, puis appuyez sur « Lire »."
                : "Lecture en cours…")}
          </p>
          <div className={s.speechBarActions}>
            {selectionMode && (
              <Button
                type="button"
                size="sm"
                disabled={speaking}
                onClick={readSelectionFromBar}
              >
                Lire
              </Button>
            )}
            {speaking && (
              <Button type="button" size="sm" variant="outline" onClick={stopReading}>
                Arrêter
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={dismissSelectionMode}
            >
              Fermer
            </Button>
          </div>
        </div>
      )}

      <dialog
        ref={dialog}
        id="a11y-preferences"
        className={s.dialog}
        aria-labelledby="a11y-title"
        aria-describedby="a11y-summary"
        onCancel={(event) => {
          event.preventDefault();
          handleClose();
        }}
        onClose={() => {
          if (panelOpen) closePanel();
          trigger.current?.focus();
        }}
      >
        <div className={s.heading}>
          <span className={s.icon}>
            <Icon name="eye" size={24} />
          </span>
          <div>
            <p className={s.eyebrow}>Aides à la lecture</p>
            <h2 id="a11y-title">Options d’accessibilité</h2>
          </div>
          <button
            className={s.close}
            type="button"
            aria-label="Fermer les options d’accessibilité"
            onClick={handleClose}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <p id="a11y-summary">
          Adaptez l’affichage selon vos besoins (malvoyance, dyslexie, sensibilité
          au mouvement) et écoutez le contenu à voix haute. Les changements
          s’appliquent immédiatement sur cet appareil. Ces aides complètent le
          site ; elles ne remplacent ni un audit RGAA ni un lecteur d’écran
          complet (NVDA, VoiceOver…).
        </p>

        <fieldset className={s.group}>
          <legend>Écouter le contenu</legend>
          <p className={s.help}>
            « Lire la page » démarre tout de suite. « Lire la sélection » ferme ce
            panneau pour vous laisser surligner du texte, puis lire.
          </p>
          {!speechSupported ? (
            <p className={s.notice} role="status">
              Lecture vocale indisponible dans ce navigateur. Utilisez un
              lecteur d’écran dédié.
            </p>
          ) : (
            <div className={s.speechActions}>
              <Button type="button" variant="outline" onClick={readPage}>
                Lire la page
              </Button>
              <Button type="button" variant="outline" onClick={armSelectionMode}>
                Lire la sélection
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!speaking}
                onClick={stopReading}
              >
                Arrêter
              </Button>
            </div>
          )}
          {speechMessage && !selectionMode && (
            <p className={s.notice} role="status">
              {speechMessage}
            </p>
          )}
        </fieldset>

        <fieldset className={s.group}>
          <legend>Taille du texte</legend>
          <div className={s.radios} role="presentation">
            {textSizes.map((option) => (
              <Radio
                key={option.value}
                name="a11y-text-size"
                checked={preferences.textSize === option.value}
                onChange={() => setTextSize(option.value)}
              >
                {option.label}
              </Radio>
            ))}
          </div>
        </fieldset>

        <fieldset className={s.group}>
          <legend>Affichage</legend>
          <div className={s.checks}>
            <Checkbox
              checked={preferences.highContrast}
              onChange={(event) => setHighContrast(event.target.checked)}
            >
              Contraste élevé
            </Checkbox>
            <Checkbox
              checked={preferences.readableFont}
              onChange={(event) => setReadableFont(event.target.checked)}
            >
              Police plus lisible (lecture facilitée)
            </Checkbox>
            <Checkbox
              checked={preferences.wideSpacing}
              onChange={(event) => setWideSpacing(event.target.checked)}
            >
              Espacement du texte augmenté
            </Checkbox>
            <Checkbox
              checked={preferences.underlineLinks}
              onChange={(event) => setUnderlineLinks(event.target.checked)}
            >
              Souligner tous les liens
            </Checkbox>
            <Checkbox
              checked={preferences.reduceMotion}
              onChange={(event) => setReduceMotion(event.target.checked)}
            >
              Réduire les animations
            </Checkbox>
          </div>
        </fieldset>

        {!persisted && (
          <p className={s.notice} role="status">
            Votre navigateur empêche la mémorisation : les choix s’appliquent
            seulement à cette visite.
          </p>
        )}

        <div className={s.actions}>
          <Button type="button" variant="outline" onClick={resetPreferences}>
            Réinitialiser
          </Button>
          <Button type="button" onClick={handleClose}>
            Fermer
          </Button>
        </div>

        <p className={s.footnote}>
          En savoir plus sur notre démarche :{" "}
          <a href="/accessibilite" onClick={handleClose}>
            page Accessibilité
          </a>
          .
        </p>
      </dialog>
    </>
  );
}
