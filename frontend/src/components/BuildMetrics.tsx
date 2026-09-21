import { useEffect, useState } from 'react';
import s from './BuildMetrics.module.css';

type Report = {
  schemaVersion: 1;
  measuredAt: string;
  artifactSha256: string;
  installed: { bytes: number; fileCount: number };
  initial: { bytes: number };
  transfers: null | {
    measuredAt: string;
    environment: string;
    transferBytes: number;
    resourceCount: number;
    artifactSha256: string;
  };
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

function isReport(value: unknown): value is Report {
  if (!isObject(value) || value.schemaVersion !== 1 || typeof value.artifactSha256 !== 'string'
    || !/^[a-f0-9]{64}$/.test(value.artifactSha256) || !isDate(value.measuredAt)
    || !isObject(value.installed) || !isCount(value.installed.bytes) || !isCount(value.installed.fileCount)
    || value.installed.bytes === 0 || value.installed.fileCount === 0
    || !isObject(value.initial) || !isCount(value.initial.bytes) || value.initial.bytes === 0
    || value.initial.bytes > value.installed.bytes) return false;
  const transfers = value.transfers;
  return transfers === null || (isObject(transfers)
    && transfers.artifactSha256 === value.artifactSha256
    && isDate(transfers.measuredAt)
    && typeof transfers.environment === 'string' && transfers.environment.trim().length > 0
    && isCount(transfers.transferBytes) && isCount(transfers.resourceCount));
}

const size = (bytes: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(bytes / (bytes >= 1_000_000 ? 1_000_000 : 1_000)) + (bytes >= 1_000_000 ? ' Mo' : ' ko');
const date = (value: string) => new Date(value).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

function MeasurementReport() {
  const [report, setReport] = useState<Report | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    fetch('/quality/build-weight.json', { signal: abort.signal, cache: 'no-cache' })
      .then(async response => {
        if (!response.ok) throw new Error('Report unavailable');
        const value: unknown = await response.json();
        if (!isReport(value)) throw new Error('Invalid report');
        if (!abort.signal.aborted) setReport(value);
      })
      .catch(() => { if (!abort.signal.aborted) setFailed(true); });
    return () => abort.abort();
  }, []);

  return <div className={s.report}>
    {!report ? <p role="status">{failed ? 'Les mesures ne sont pas disponibles pour le moment. Vous pouvez réessayer en rechargeant la page.' : 'Chargement des mesures…'}</p> : <>
      <p className={s.date}>Version mesurée le <time dateTime={report.measuredAt}>{date(report.measuredAt)} (Paris)</time>.</p>
      <dl className={s.figures}>
        <div>
          <dt>Tous les fichiers hébergés</dt>
          <dd><strong>{size(report.installed.bytes)}</strong><p>{report.installed.fileCount} fichiers avant compression, y compris les outils de lecture de documents. Tout cela n’est pas téléchargé à chaque visite.</p></dd>
        </div>
        <div>
          <dt>Base de la page d’accueil</dt>
          <dd><strong>{size(report.initial.bytes)}</strong><p>Estimation partielle, avant compression, des fichiers de démarrage. Les écrans et les ressources chargés ensuite s’y ajoutent.</p></dd>
        </div>
      </dl>
      <div className={s.network}>
        <h3>Ce qui passe réellement sur le réseau</h3>
        {report.transfers ? <p>{size(report.transfers.transferBytes)} pour {report.transfers.resourceCount} ressources, mesurés le <time dateTime={report.transfers.measuredAt}>{date(report.transfers.measuredAt)} (Paris)</time>. Contexte : {report.transfers.environment}.</p>
          : <p>Ce n’est pas encore mesuré pour cette version. La compression et le cache du navigateur changent la quantité réellement transférée.</p>}
      </div>
    </>}
    <a href="/quality/build-weight.json">Consulter le rapport de cette version<span aria-hidden="true"> ↗</span></a>
  </div>;
}

export function BuildMetrics() {
  const [hasOpened, setHasOpened] = useState(false);
  return <details className={s.disclosure} onToggle={event => { if (event.currentTarget.open) setHasOpened(true); }}>
    <summary>Voir les mesures du site</summary>
    {hasOpened && <MeasurementReport />}
  </details>;
}
