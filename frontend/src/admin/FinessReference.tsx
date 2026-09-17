export type FinessReferenceState = {
  status: 'CURRENT' | 'DUE' | 'EXPIRED' | 'MISSING' | 'INVALID';
  generatedAt: string | null; importedAt: string | null; expiresAt: string | null;
  daysRemaining: number | null; ageDays: number | null; establishmentCount: number | null;
  message: string; sourceUrl: string | null; policyMonths: 1; warningDays: 7;
};
const labels = { CURRENT: 'À jour', DUE: 'À renouveler bientôt', EXPIRED: 'Validité dépassée', MISSING: 'Référentiel absent', INVALID: 'Validité non vérifiable' };
function parisDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Non renseignée';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(value));
}
function safeSource(value: string | null) {
  try { const url = new URL(value || ''); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
export function FinessReference({ data }: { data?: FinessReferenceState | null }) {
  const status = data?.status && data.status in labels ? data.status : 'MISSING';
  const days = data?.daysRemaining;
  const knownDays = typeof days === 'number' && Number.isFinite(days);
  const countdown = knownDays && (status === 'CURRENT' || status === 'DUE') ? `J-${Math.max(0, Math.ceil(days))}` : status === 'EXPIRED' && knownDays ? (days === 0 ? 'Échéance atteinte' : `Dépassée de ${Math.abs(Math.floor(days))} jour${Math.abs(Math.floor(days)) > 1 ? 's' : ''}`) : null;
  const source = safeSource(data?.sourceUrl || null);
  return <section className="admin-panel admin-finess" data-state={status} aria-label="Validité du référentiel FINESS">
    <div className="admin-finess-heading"><h2>Référentiel FINESS</h2><div className="admin-finess-status" role="status"><span>{labels[status]}</span>{countdown && <strong>{countdown}</strong>}</div></div>
    <p>{data?.message || 'Aucune information de validité du référentiel n’est disponible.'}</p>
    <dl className="admin-finess-dates">
      <div><dt>Généré le</dt><dd>{parisDate(data?.generatedAt || null)}</dd></div>
      <div><dt>Importé le</dt><dd>{parisDate(data?.importedAt || null)}</dd></div>
      <div><dt>Valable jusqu’au</dt><dd>{parisDate(data?.expiresAt || null)}</dd></div>
      {typeof data?.establishmentCount === 'number' && <div><dt>Établissements</dt><dd>{data.establishmentCount.toLocaleString('fr-FR')}</dd></div>}
    </dl>
    <p className="admin-caption">Validité maximale : 1 mois calendaire depuis la génération. Alerte 7 jours avant l’échéance. Réimporter le même fichier ne prolonge pas sa validité. Dates : Europe/Paris.</p>
    {source && <a href={source} target="_blank" rel="noopener noreferrer">Consulter la source officielle FINESS ↗</a>}
  </section>;
}
