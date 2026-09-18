/** Lecture à voix haute via l’API Web Speech du navigateur (pas un lecteur d’écran). */

const MAX_CHARS = 12000;

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickFrenchVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /^fr(-|$)/i.test(v.lang) && /france|français|french/i.test(v.name)) ||
    voices.find((v) => /^fr(-|$)/i.test(v.lang)) ||
    null
  );
}

function collectReadableText(root: Element): string {
  const clone = root.cloneNode(true) as Element;
  clone
    .querySelectorAll(
      "script, style, noscript, svg, [hidden], [aria-hidden='true'], dialog, .skipLink",
    )
    .forEach((el) => el.remove());
  const text = (clone.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return text.slice(0, MAX_CHARS);
}

export function pageTextForSpeech(): string {
  const main =
    document.getElementById("contenu") ||
    document.querySelector("main") ||
    document.body;
  if (!main) return "";
  return collectReadableText(main);
}

export function selectionTextForSpeech(): string {
  const raw = window.getSelection()?.toString().trim() || "";
  return raw.slice(0, MAX_CHARS);
}

export function stopSpeech() {
  if (!isSpeechSynthesisAvailable()) return;
  window.speechSynthesis.cancel();
}

export function speakText(
  text: string,
  onEnd?: () => void,
): { ok: true } | { ok: false; reason: string } {
  if (!isSpeechSynthesisAvailable()) {
    return {
      ok: false,
      reason:
        "La lecture vocale n’est pas disponible dans ce navigateur. Utilisez un lecteur d’écran (NVDA, VoiceOver…).",
    };
  }
  const cleaned = text.trim();
  if (!cleaned) {
    return {
      ok: false,
      reason: "Aucun texte à lire sur cette page.",
    };
  }

  stopSpeech();

  // Chromium charge parfois les voix de façon asynchrone.
  const start = () => {
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = "fr-FR";
    utterance.rate = 1;
    const voice = pickFrenchVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  };

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener("voiceschanged", start, {
      once: true,
    });
    // Déclenche le chargement des voix sur certains navigateurs.
    window.speechSynthesis.getVoices();
  } else {
    start();
  }

  return { ok: true };
}
