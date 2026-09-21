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
  const received = await response.json().catch(() => null);
  const valid = received !== null && typeof received === 'object' && !Array.isArray(received);
  const data = valid ? received : {};
  if (!response.ok) {
    const code = data.code || data.error?.code || '';
    if (response.status === 401 && path !== '/login' && path !== '/activate' && path !== '/invitation/check' && !path.startsWith('/mfa')) window.dispatchEvent(new Event('admin-session-expired'));
    throw new AdminError(response.status, code, response.status === 401 ? (path === '/invitation/check' ? 'Invitation invalide, expirée ou déjà utilisée. Vérifiez le code reçu. Si votre accès a déjà été activé, choisissez “J’ai déjà un accès”.' : path === '/activate' ? 'Activation impossible. Corrigez l’invitation pour reprendre la vérification de votre accès.' : path === '/login' ? 'Connexion impossible. Vérifiez votre adresse e-mail et votre mot de passe. Si vous utilisez une invitation, elle doit être encore valide.' : path.startsWith('/mfa') ? 'Code invalide, déjà utilisé ou vérification expirée. Essayez le code suivant ; si le problème persiste, revenez à la connexion.' : 'La session a expiré. Reconnectez-vous.') : response.status === 403 ? (code === 'ADMIN_REAUTH_REQUIRED' ? 'Confirmez votre mot de passe et votre code de sécurité pour continuer.' : 'Votre rôle ne permet pas cette opération.') : response.status === 429 ? 'Trop de tentatives. Patientez avant de réessayer.' : response.status >= 500 ? 'Le service ne répond pas. Réessayez.' : typeof data.message === 'string' ? data.message : 'Le service ne répond pas. Réessayez.');
  }
  if (!valid || (path === '/invitation/check' && typeof data.passwordSetupRequired !== 'boolean') || (path === '/csrf' && (typeof data.csrfToken !== 'string' || !data.csrfToken.trim())))
    throw new AdminError(response.status, 'INVALID_RESPONSE', 'La réponse du service est inattendue. Réessayez ; aucune confirmation reçue.');
  if (path !== '/invitation/check' && typeof data.csrfToken === 'string' && data.csrfToken.trim()) csrf = data.csrfToken;
  return data;
}
export function clearSession() { csrf = ''; }
