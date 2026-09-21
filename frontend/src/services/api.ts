import { serverMessages, explainReasons } from "./messages";

/** Message 429 actionnable à partir de l’en-tête Retry-After (secondes ou date HTTP). */
export function formatRateLimitMessage(retryAfter: string | null): string {
  if (!retryAfter?.trim()) {
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  }
  const raw = retryAfter.trim();
  // Reject malformed numeric values rather than interpreting them as dates.
  let seconds = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isFinite(seconds) && /^[A-Za-z]{3}, /.test(raw)) {
    const until = Date.parse(raw);
    if (Number.isFinite(until)) seconds = Math.ceil((until - Date.now()) / 1000);
  }
  if (!Number.isFinite(seconds)) {
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  }
  seconds = Math.max(1, Math.ceil(seconds));
  if (seconds < 60) {
    return `Trop de tentatives. Réessayez dans ${seconds} seconde${seconds > 1 ? "s" : ""}.`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `Trop de tentatives. Réessayez dans environ ${minutes} minute${minutes > 1 ? "s" : ""}.`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: unknown,
  ) {
    super(message);
  }
}
let csrf: string | null = null;
let pendingCsrf: Promise<void> | null = null;
const base = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");
export function resetCsrf() {
  csrf = null;
}
export function acceptCsrf(value: string) {
  csrf = value;
}
async function getCsrf() {
  if (!pendingCsrf)
    pendingCsrf = (async () => {
      let r: Response;
      try {
        r = await fetch(base + "/auth/csrf", {
          credentials: "include",
          cache: "no-store",
        });
      } catch {
        throw new ApiError(
          0,
          "NETWORK",
          "Serveur indisponible. Votre formulaire est conservé ; réessayez dans un instant.",
        );
      }
      if (!r.ok)
        throw new ApiError(
          r.status,
          "CSRF_UNAVAILABLE",
          "Impossible de préparer la connexion.",
        );
      const data = await r.json().catch(() => null);
      if (!data || typeof data.csrfToken !== "string" || !data.csrfToken.trim())
        throw new ApiError(r.status, "INVALID_RESPONSE", "Impossible de préparer la connexion. Réessayez.");
      csrf = data.csrfToken;
    })().finally(() => {
      pendingCsrf = null;
    });
  await pendingCsrf;
}
export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    key?: string;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const method = options.method || "GET";
  const write = !["GET", "HEAD"].includes(method);
  if (write && navigator.onLine === false) throw new ApiError(0, "OFFLINE", "Connexion nécessaire. Aucune modification n’a été envoyée ; réessayez une fois connecté.");
  if (write && !csrf) await getCsrf();
  for (let attempt = 0; attempt < 2; attempt++) {
    let r: Response;
    try {
      r = await fetch(base + path, {
        method,
        credentials: "include",
        cache: "no-store",
        signal: options.signal,
        headers: {
          ...(options.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...(write ? { "X-CSRF-Token": csrf || "" } : {}),
          ...(options.key ? { "Idempotency-Key": options.key } : {}),
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      throw new ApiError(
        0,
        "NETWORK",
        "Serveur indisponible. Réessayez : aucune confirmation reçue.",
      );
    }
    const received = await r.json().catch(() => null);
    const data = received !== null && typeof received === "object" ? received : {};
    if (options.signal?.aborted)
      throw new DOMException("Request aborted", "AbortError");
    if (r.ok) {
      if (r.status === 204) return undefined as T;
      if (received === null || typeof received !== "object")
        throw new ApiError(r.status, "INVALID_RESPONSE", "La réponse du service est inattendue. Réessayez ; aucune confirmation reçue.");
      if (typeof data.csrfToken === "string" && data.csrfToken.trim()) acceptCsrf(data.csrfToken);
      return data as T;
    }
    if (r.status === 403 && data.code === "CSRF_INVALID" && attempt === 0) {
      resetCsrf();
      await getCsrf();
      continue;
    }
    if (r.status === 401 && !["/auth/login", "/auth/google", "/auth/google/registration", "/auth/google/register"].includes(path)) {
      resetCsrf();
      window.dispatchEvent(new Event("infimatch:session-expired"));
    }
    const message = Array.isArray(data.message)
      ? data.message.join(" · ")
      : data.message;
    const googleMessages: Record<string, string> = {
      CLOSURE_GOOGLE_EXPIRED: "La confirmation a expiré. Relancez la confirmation Google.",
      CLOSURE_GOOGLE_MISMATCH: "Choisissez le compte Google associé à votre compte InfiMatch.",
      CLOSURE_GOOGLE_INVALID: "La réponse Google est invalide. Relancez la confirmation Google.",
      GOOGLE_UNAVAILABLE: "La vérification Google est temporairement indisponible. Votre formulaire est conservé ; réessayez dans un instant.",
      GOOGLE_REGISTRATION_EXPIRED: "Votre vérification Google a expiré. Reprenez avec Google ; votre brouillon est conservé.",
      GOOGLE_LINK_REQUIRED: "Un compte InfiMatch existe déjà avec cette adresse. Confirmez son mot de passe InfiMatch pour associer Google.",
      GOOGLE_TOKEN_INVALID: "La réponse de Google est invalide ou expirée. Relancez la connexion Google.",
      GOOGLE_CHALLENGE_EXPIRED: "La demande de connexion Google a expiré. Cliquez à nouveau sur le bouton Google.",
      GOOGLE_PASSWORD_INVALID: "Le mot de passe InfiMatch est incorrect. Saisissez celui de votre compte InfiMatch, pas votre mot de passe Google.",
      GOOGLE_ACCOUNT_REQUIRED: "Aucun compte InfiMatch ne correspond à cette adresse Google. Créez un compte avec exactement la même adresse, puis associez Google.",
    };
    throw new ApiError(
      r.status,
      data.code || "REQUEST_FAILED",
      (path.startsWith("/auth/google") || path.startsWith("/me/closure-request/google")) && googleMessages[data.code]
        ? googleMessages[data.code]
        : path === "/auth/google" && r.status === 401
          ? "Connexion Google refusée. Vérifiez que votre compte InfiMatch utilise exactement la même adresse Google et saisissez votre mot de passe InfiMatch pour la première association."
        : ["/auth/register", "/auth/google/register"].includes(path) &&
        data.message === "Registration unavailable for these details"
        ? "Inscription impossible avec ces informations. Si vous avez déjà un compte, connectez-vous."
        : data.code === "CLOSURE_PASSWORD_INVALID"
          ? "Mot de passe incorrect. Vérifiez votre mot de passe actuel et réessayez."
        : data.code === "INELIGIBLE"
          ? "Votre profil ne remplit pas les conditions de cette mission. " +
            explainReasons(data.fields)
          : data.code === "STAFFING_REQUEST_INVALID"
            ? message || "Vérifiez les dates et les critères du besoin."
          : data.code === "AVAILABILITY_LIMIT"
            ? "Votre planning dépasse 200 périodes distinctes par état. Réduisez la période sélectionnée ou regroupez vos créneaux."
          : r.status === 413
            ? "La limite de stockage ou la taille maximale du fichier est dépassée."
          : r.status === 429
            ? formatRateLimitMessage(r.headers.get("Retry-After"))
            : r.status === 401
              ? "Identifiants incorrects ou session expirée."
              : r.status === 403
                ? "Action refusée. Vérifiez votre accès et la configuration du service."
                : data.code === "ACTIVE_ASSIGNMENT_INCOMPATIBLE"
                  ? "Cette modification rendrait une mission confirmée incompatible. " +
                    explainReasons(data.fields)
                  : serverMessages[message] ||
                    (r.status === 400
                      ? "Vérifiez les champs renseignés et les formats demandés."
                      : r.status === 404
                        ? "Cet élément est introuvable ou inaccessible avec votre compte."
                        : message || "La demande a échoué."),
      data.fields,
    );
  }
  throw new Error("La demande a échoué.");
}

export async function downloadDocument(id: string) {
  const response = await fetch(
    base + "/me/documents/" + encodeURIComponent(id),
    { credentials: "include", cache: "no-store" },
  );
  if (!response.ok)
    throw new Error(
      response.status === 403 || response.status === 404
        ? "Ce document n’est pas accessible avec votre compte."
        : "Le téléchargement a échoué. Réessayez.",
    );
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    "infimatch-" +
    id +
    (blob.type.includes("wordprocessingml") ? ".docx" : blob.type.includes("pdf")
      ? ".pdf"
      : blob.type.includes("png")
        ? ".png"
        : ".jpg");
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
