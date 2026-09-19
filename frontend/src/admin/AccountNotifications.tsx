import {AccountEmails} from './AccountEmails';
import { Badge, DataState, date, useData, type Row } from './App';

const connectionLabels: Record<string, string> = { ASSOCIATED: 'Compte Discord associé', PENDING: 'Association en attente', EXPIRED: 'Association expirée', NOT_ASSOCIATED: 'Aucun compte Discord associé' };
const preferenceLabels: Record<string, string> = { ENABLED: 'Notifications personnelles activées', DISABLED: 'Notifications personnelles désactivées', NO_EVENTS: 'Aucun événement actif', NOT_ASSOCIATED: 'Association Discord nécessaire' };
const deliveryLabels: Record<string, string> = { CANCELLED: 'Envoi annulé', UNCERTAIN: 'Résultat incertain', SENT: 'Accepté par Discord', PENDING: 'En attente', FAILED: 'Échec', RETRY: 'Nouvelle tentative prévue', PROCESSING: 'En cours', SENDING: 'En cours', DEAD: 'Échec définitif', SKIPPED: 'Non envoyé' };
function errorLabel(value: unknown) {
  if (typeof value !== 'string') return 'Aucune erreur signalée';
  if (/^DISCORD_HTTP_\d{3}$/.test(value)) return `Réponse Discord : HTTP ${value.slice(-3)}`;
  if (value === 'DELIVERY_UNCERTAIN') return 'Résultat de transmission incertain';
  return 'Échec de transmission';
}
function Events({ events, catalog, empty }: { events: string[]; catalog: Record<string, string>; empty: string }) {
  return events.length ? <ul className="admin-reasons">{events.map(event => <li key={event}>{catalog[event] || event}</li>)}</ul> : <p className="admin-caption">{empty}</p>;
}
export function AccountNotifications({ id, version }: { id: string; version: number }) {
  const request = useData(`/accounts/${encodeURIComponent(id)}/notifications`, version);
  return <><AccountEmails id={id} version={version}/><section className="admin-panel"><h2>Notifications et Discord</h2><p>Consultation uniquement. L’association prouve le rattachement du compte Discord ; elle n’indique pas si la personne est en ligne.</p><DataState request={request}>{d => {
    const catalog = d.catalog || {}; const connection = d.connection || {}; const personal = d.personal || {}; const deliveries = d.deliveries || {};
    const recent: Row[] = (deliveries.recent || []).slice(0, 10);
    return <><p className="admin-caption">État observé le {date(d.observedAt)} · Europe/Paris</p>
      <h3>Compte Discord personnel</h3><Badge value={connectionLabels[connection.state] || 'Association non vérifiée'} />
      <dl className="admin-facts"><div><dt>Identifiant Discord</dt><dd>{connection.discordUserId || 'Non associé'}</dd></div><div><dt>Association confirmée</dt><dd>{date(connection.connectedAt)}</dd></div>{['PENDING', 'EXPIRED'].includes(connection.state) && <div><dt>Expiration de la demande d’association</dt><dd>{date(connection.challengeExpiresAt)}</dd></div>}</dl>
      <h3>Préférences personnelles</h3><Badge value={preferenceLabels[personal.state] || 'Préférences non vérifiées'} />
      {personal.state === 'NO_EVENTS' && <p className="admin-caption">Le compte ne reçoit aucune notification personnelle Discord : aucun événement n’est actif.</p>}
      {personal.state === 'DISABLED' && <p className="admin-caption">Les envois personnels Discord sont désactivés, même si des événements ont été sélectionnés.</p>}
      <p className="admin-caption">Dernier réglage de destination : {date(personal.updatedAt)}</p>
      <h4>Événements effectivement actifs</h4><Events events={personal.effectiveEvents || []} catalog={catalog} empty="Aucun événement effectivement actif." />
      <details><summary>Sélection et événements mis en sourdine</summary><h4>Événements sélectionnés</h4><Events events={personal.selectedEvents || []} catalog={catalog} empty="Aucun événement sélectionné." /><h4>Événements mis en sourdine</h4><Events events={personal.mutedEvents || []} catalog={catalog} empty="Aucun événement mis en sourdine." /></details>
      <h3>Notifications dans InfiMatch</h3><p className="admin-caption">Disponibles indépendamment de Discord.</p><dl className="admin-facts"><div><dt>Notifications internes</dt><dd>{d.internal?.total ?? 'Non connu'}</dd></div><div><dt>Non lues dans InfiMatch</dt><dd>{d.internal?.unread ?? 'Non connu'}</dd></div></dl>
      <h3>Envois personnels Discord</h3><p className="admin-caption">« Accepté par Discord » ne prouve pas que le message a été lu. Les compteurs concernent les états enregistrés, sans mesure de présence ni contrôle du bot.</p><dl className="admin-facts">{Object.entries(deliveries.counts || {}).map(([status, count]) => <div key={status}><dt>{deliveryLabels[status] || status}</dt><dd>{String(count)}</dd></div>)}</dl>
      {deliveries.latest && <p className="admin-caption">Dernier envoi : {catalog[deliveries.latest.kind] || deliveries.latest.kind} · {deliveryLabels[deliveries.latest.status] || deliveries.latest.status} · {date(deliveries.latest.sentAt || deliveries.latest.createdAt)}. {deliveries.latest.errorCode ? errorLabel(deliveries.latest.errorCode) : ''}</p>}
      {recent.length ? <div className="admin-table-scroll" role="region" aria-label="Dix derniers envois personnels Discord" tabIndex={0}><table><thead><tr>{['Événement', 'Résultat', 'Tentatives', 'Création', 'Acceptation Discord', 'Constat'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{recent.map(row => <tr key={row.id}><td>{catalog[row.kind] || row.kind}</td><td><Badge value={deliveryLabels[row.status] || row.status} /></td><td>{row.attempts}</td><td>{date(row.createdAt)}</td><td>{date(row.sentAt)}</td><td>{errorLabel(row.errorCode)}</td></tr>)}</tbody></table></div> : <p className="admin-caption">Aucun envoi personnel Discord enregistré.</p>}
      <h3>Canaux des organisations</h3><p className="admin-caption">Ces réglages appartiennent aux organisations et sont distincts des préférences personnelles du compte.</p>
      {d.organizations?.length ? d.organizations.map((org: Row) => <section key={org.id} className="admin-panel"><h4>{org.name}</h4><Badge value={!org.configured ? 'Canal non configuré' : org.enabled ? 'Envois du canal activés' : 'Envois du canal désactivés'} /><dl className="admin-facts"><div><dt>Canal</dt><dd>{org.channelName || 'Non renseigné'}</dd></div><div><dt>Dernier changement</dt><dd>{date(org.updatedAt)}</dd></div></dl><Events events={org.events || []} catalog={catalog} empty="Aucun événement sélectionné pour cette organisation." /></section>) : <p className="admin-caption">Aucune organisation rattachée dans ce périmètre.</p>}
    </>;
  }}</DataState></section></>;
}
