let csrf = '';
export class AdminError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export async function api<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
  if (body !== undefined && !csrf && path !== '/csrf') await api('/csrf');
  const response = await fetch(`/api/v1/admin${path}`, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'include', cache: 'no-store',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = data.code || data.error?.code || '';
    if (response.status === 401 && path !== '/login' && path !== '/activate' && !path.startsWith('/mfa')) window.dispatchEvent(new Event('admin-session-expired'));
    throw new AdminError(response.status, code, response.status === 401 ? (path === '/activate' ? 'Activation impossible. Si vous avez déjà choisi votre mot de passe, revenez à la connexion et utilisez votre invitation pour terminer la configuration.' : path === '/login' ? 'Vérifiez votre email, votre mot de passe et, pour la première connexion, votre invitation.' : path.startsWith('/mfa') ? 'Code invalide, déjà utilisé ou vérification expirée. Essayez le code suivant ; si le problème persiste, revenez à la connexion.' : 'La session a expiré. Reconnectez-vous.') : response.status === 403 ? (code === 'ADMIN_REAUTH_REQUIRED' ? 'Confirmez votre mot de passe et votre code de sécurité pour continuer.' : 'Votre rôle ne permet pas cette opération.') : response.status === 429 ? 'Trop de tentatives. Patientez avant de réessayer.' : typeof data.message === 'string' ? data.message : 'Le service ne répond pas. Réessayez.');
  }
  if (typeof data.csrfToken === 'string') csrf = data.csrfToken;
  return data;
}
export function clearSession() { csrf = ''; }
