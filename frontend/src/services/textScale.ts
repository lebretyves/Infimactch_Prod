import type { TextSizePreference } from "@/services/accessibilityPreferences";

const BASE_ATTR = "data-a11y-fs-base";

const SCALES: Record<TextSizePreference, number> = {
  normal: 1,
  large: 1.22,
  xlarge: 1.45,
};

let currentSize: TextSizePreference = "normal";
let applying = false;
let observer: MutationObserver | null = null;
let debounceTimer = 0;

function scaleRoot(): HTMLElement {
  return document.getElementById("root") ?? document.body;
}

function shouldSkip(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true;
  const tag = el.tagName;
  if (
    tag === "SCRIPT" ||
    tag === "STYLE" ||
    tag === "NOSCRIPT" ||
    tag === "SVG" ||
    tag === "IMG" ||
    tag === "VIDEO" ||
    tag === "CANVAS" ||
    tag === "IFRAME" ||
    tag === "PATH" ||
    tag === "CIRCLE" ||
    tag === "RECT" ||
    tag === "LINE" ||
    tag === "POLYLINE" ||
    tag === "POLYGON" ||
    tag === "G" ||
    tag === "USE"
  )
    return true;
  if (el.closest("svg")) return true;
  return false;
}

function clearTextScale(root: HTMLElement) {
  root.querySelectorAll(`[${BASE_ATTR}]`).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.style.removeProperty("font-size");
    node.removeAttribute(BASE_ATTR);
  });
}

/**
 * Agrandit réellement les font-size (px/rem/em) sans zoomer la page
 * (images, largeurs, etc. restent stables).
 */
export function applyTextScale(size: TextSizePreference) {
  currentSize = size;
  const root = scaleRoot();
  const factor = SCALES[size];

  applying = true;
  try {
    clearTextScale(root);
    if (factor === 1) return;

    const bases = new Map<HTMLElement, number>();
    root.querySelectorAll("*").forEach((node) => {
      if (shouldSkip(node) || !(node instanceof HTMLElement)) return;
      const px = parseFloat(getComputedStyle(node).fontSize);
      if (!Number.isFinite(px) || px <= 0) return;
      bases.set(node, px);
    });

    bases.forEach((px, el) => {
      el.setAttribute(BASE_ATTR, String(px));
      el.style.setProperty("font-size", `${+(px * factor).toFixed(2)}px`, "important");
    });
  } finally {
    applying = false;
  }
}

/** Réapplique la taille après navigation SPA / contenu dynamique. */
export function watchTextScale() {
  if (observer || typeof MutationObserver === "undefined") return;
  const root = scaleRoot();
  observer = new MutationObserver(() => {
    if (applying || currentSize === "normal") return;
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      if (currentSize !== "normal") applyTextScale(currentSize);
    }, 120);
  });
  observer.observe(root, { childList: true, subtree: true });
}
