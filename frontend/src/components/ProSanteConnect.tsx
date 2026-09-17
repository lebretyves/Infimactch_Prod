import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { api, ApiError } from '@/services/api';
import { Button } from '@/ui/Button';
const feedback: Record<string, string> = {
  indisponible: 'Pro Santé Connect est indisponible. Votre connexion habituelle reste disponible.',
  annule: 'La connexion Pro Santé Connect a été annulée. Vous pouvez réessayer ou utiliser votre connexion habituelle.',
  'association-requise': 'Connectez-vous d’abord à votre compte InfiMatch habituel, puis associez Pro Santé Connect depuis votre profil.',
  echec: 'La réponse Pro Santé Connect n’a pas pu être validée. Aucun statut professionnel n’a été accordé. Réessayez ou utilisez votre connexion habituelle.',
  associe: 'L’association Pro Santé Connect a été enregistrée. Elle reste distincte de la correspondance dans l’Annuaire Santé et de la validation métier du dossier.',
};
export function ProSanteConnect({ purpose = 'login' }: { purpose?: 'login' | 'link' }) {
  const [config, setConfig] = useState<{enabled: boolean; environment?: string} | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const location = useLocation();
  const callback = feedback[new URLSearchParams(location.search).get('psc') || ''];
  useEffect(() => {
    const controller = new AbortController();
    void api<{enabled: boolean; environment?: string}>('/auth/psc/config', { signal: controller.signal }).then(setConfig).catch(() => {});
    return () => controller.abort();
  }, []);
  async function start() {
    setBusy(true); setError('');
    try {
      const { url } = await api<{url: string}>('/auth/psc/start', { method: 'POST', body: { purpose } });
      const target = new URL(url);
      if (target.protocol !== 'https:') throw new Error('PSC_REDIRECT');
      window.location.assign(target.href);
    } catch (cause) {
      setError(purpose === 'link' && cause instanceof ApiError && [401,403].includes(cause.status)
        ? 'Pour associer votre identité, reconnectez-vous à InfiMatch puis revenez ici dans les cinq minutes. Enregistrez vos modifications avant de quitter cette page.'
        : 'Pro Santé Connect n’a pas pu démarrer. Votre connexion habituelle reste disponible. Réessayez plus tard.');
      setBusy(false);
    }
  }
  if (!config?.enabled && !callback) return null;
  return <section aria-label="Pro Santé Connect" style={{ display: 'grid', gap: '.75rem', paddingBlock: '1rem' }}>
    {callback && <p role="status">{callback}</p>}
    {config?.enabled && <>
      {purpose === 'link' && <h2>Associer Pro Santé Connect</h2>}
      <p>Authentification des professionnels de santé avec CPS ou e-CPS. Elle ne remplace pas la vérification du RPPS dans l’annuaire ni la validation du dossier par l’organisation.</p>
      {config.environment && config.environment !== 'production' && <p>Environnement de test Pro Santé Connect.</p>}
      {purpose === 'link' && <p>Enregistrez votre profil avant de continuer. Une connexion InfiMatch datant de moins de cinq minutes est nécessaire.</p>}
      <Button type="button" variant="outline" onClick={start} loading={busy}>{purpose === 'link' ? 'Associer mon identité avec Pro Santé Connect' : 'Se connecter avec Pro Santé Connect'}</Button>
      {error && <p role="alert">{error}</p>}
    </>}
  </section>;
}
