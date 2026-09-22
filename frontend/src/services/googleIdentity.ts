export type IdentityClient = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    auto_select: boolean;
    callback: (response: { credential: string }) => void;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: { theme: string; size: string; text: string; width?: string },
  ) => void;
  cancel?: () => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: IdentityClient } };
  }
}
let allowed = false;
let sdk: Promise<void> | undefined;
let script: HTMLScriptElement | undefined;
let rejectPending: ((reason: Error) => void) | undefined;
let generation = 0;
export function setGoogleIdentityPermission(value: boolean) {
  allowed = value;
  if (value) return;
  generation += 1;
  try {
    window.google?.accounts.id.cancel?.();
  } catch {
    /* Google may be unavailable. */
  }
  rejectPending?.(
    new Error("Connexion Google désactivée dans vos préférences."),
  );
  rejectPending = undefined;
  script?.remove();
  script = undefined;
  sdk = undefined;
  document
    .querySelectorAll(
      'iframe[src^="https://accounts.google.com/gsi/"], #credential_picker_container',
    )
    .forEach((element) => element.remove());
}
export function isGoogleIdentityAllowed() {
  return allowed;
}
export function loadGoogleIdentity(): Promise<void> {
  if (!allowed)
    return Promise.reject(
      new Error("Autorisez la connexion Google pour continuer."),
    );
  if (window.google?.accounts.id) return Promise.resolve();
  if (!sdk) {
    const attempt = generation;
    sdk = new Promise<void>((resolve, reject) => {
      const element = document.createElement("script");
      script = element;
      const fail = (error: Error) => {
        window.clearTimeout(timeout);
        element.onload = null;
        element.onerror = null;
        element.remove();
        if (script === element) {
          script = undefined;
          sdk = undefined;
          rejectPending = undefined;
        }
        reject(error);
      };
      const unavailable = () => fail(new Error(
        "Le bouton Google n’a pas pu se charger. Réessayez ou utilisez votre adresse e-mail.",
      ));
      const timeout = window.setTimeout(unavailable, 12000);
      rejectPending = fail;
      element.src = "https://accounts.google.com/gsi/client";
      element.async = true;
      element.dataset.infimatchGoogle = "true";
      element.onload = () => {
        if (!allowed || attempt !== generation) {
          fail(new Error("Connexion Google désactivée dans vos préférences."));
        } else if (!window.google?.accounts.id) {
          unavailable();
        } else {
          window.clearTimeout(timeout);
          rejectPending = undefined;
          resolve();
        }
      };
      element.onerror = unavailable;
      document.head.appendChild(element);
    });
  }
  return sdk;
}
