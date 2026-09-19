export const RECOVERY_SEND_TIMEOUT_MS = 3000;
export const RECOVERY_RESPONSE_MINIMUM_MS = 3500;

type MailConfig = { apiKey: string; sender: string; origin: string };
export function recoveryMailConfig(): MailConfig | null {
  if (!process.env.SMTP2GO_API_KEY || !process.env.SMTP2GO_FROM) return null;
  try {
    const url = new URL(process.env.APP_ORIGIN || '');
    const localTest = process.env.NODE_ENV === 'test' && ['127.0.0.1', 'localhost'].includes(url.hostname) && url.protocol === 'http:';
    if ((url.protocol !== 'https:' && !localTest) || url.username || url.password) return null;
    return { apiKey: process.env.SMTP2GO_API_KEY, sender: process.env.SMTP2GO_FROM, origin: url.origin };
  } catch { return null; }
}

export type RecoveryMailResult =
  | { status: 'ACCEPTED'; providerId: string; error: null }
  | { status: 'FAILED' | 'UNCERTAIN'; providerId: null; error: string };

/** The reset token is held in memory only, never persisted in a mail queue or an audit. */
export async function sendRecoveryMail(config: MailConfig, email: string, token: string, transport: typeof fetch = fetch): Promise<RecoveryMailResult> {
  const url = new URL('/reinitialiser-mot-de-passe', config.origin);
  url.hash = 'token=' + token;
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  // Bound the whole exchange, including a stalled response body, not only response headers.
  const expired = new Promise<RecoveryMailResult>(resolve => {
    timeout = setTimeout(() => {
      controller.abort();
      resolve({ status: 'UNCERTAIN', providerId: null, error: 'RECOVERY_SEND_TIMEOUT' });
    }, RECOVERY_SEND_TIMEOUT_MS);
  });
  const send = async (): Promise<RecoveryMailResult> => {
    try {
      const response = await transport('https://api.smtp2go.com/v3/email/send', {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-Smtp2go-Api-Key': config.apiKey },
        body: JSON.stringify({
          sender: config.sender, to: [email], subject: 'Réinitialiser votre mot de passe InfiMatch',
          // Plain text prevents provider click tracking from rewriting the security link.
          text_body: 'Bonjour,\n\nUne demande de réinitialisation de votre mot de passe InfiMatch a été reçue.\n'
            + 'Ce lien personnel est utilisable une seule fois et expire 30 minutes après la demande :\n\n'
            + url.href + '\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message. Votre mot de passe reste inchangé.\n'
            + 'Ne transmettez pas ce lien. InfiMatch ne vous demandera jamais votre mot de passe par email.',
        }),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return { status: response.status >= 400 && response.status < 500 && response.status !== 408 ? 'FAILED' : 'UNCERTAIN', providerId: null, error: 'RECOVERY_PROVIDER_HTTP_' + response.status };
      }
      const receipt = await response.json() as { data?: { succeeded?: number; failed?: number; email_id?: string } };
      const data = receipt?.data;
      if (data?.succeeded === 1 && data.failed === 0 && typeof data.email_id === 'string' && data.email_id.length > 0 && data.email_id.length <= 200) {
        return { status: 'ACCEPTED', providerId: data.email_id, error: null };
      }
      if (data?.succeeded === 0 && data.failed === 1) return { status: 'FAILED', providerId: null, error: 'RECOVERY_PROVIDER_REJECTED' };
      return { status: 'UNCERTAIN', providerId: null, error: 'RECOVERY_PROVIDER_RECEIPT_UNKNOWN' };
    } catch {
      return { status: 'UNCERTAIN', providerId: null, error: 'RECOVERY_SEND_RESULT_UNKNOWN' };
    }
  };
  try { return await Promise.race([send(), expired]); }
  finally { clearTimeout(timeout); }
}
