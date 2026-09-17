import { Link } from 'react-router';
import { useRemote } from '@/lib/useRemote';
import { getRecommendations, type Recommendation } from '@/services/recommendations';
import { date, salary, sourceLabel, type Listing } from '@/services/market';
import { labelCode } from '@/data/professional';
import { Button, ButtonLink } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import u from './NurseUI.module.css';
import s from './MixedRecommendations.module.css';
function contractLabel(value: string) {
  const labels: Record<string, string> = { MIS: 'Intérim', INTERIM: 'Intérim', INTERIM_CONTEXT_CONFIRMED: 'Intérim', CDD: 'CDD', CDI: 'CDI' };
  return labels[value] || (/^[A-Z_]+$/.test(value) ? 'Contrat à vérifier dans la source' : value);
}
export function MixedRecommendations({ userId, isSaved, onFavorite, busy }: { userId: string; isSaved: (item: Listing) => boolean; onFavorite: (item: Listing) => void; busy: boolean }) {
  const result = useRemote(getRecommendations, userId);
  const data = result.data;
  function cards(items: Recommendation[], external: boolean) {
    return <ul>{items.map(item => <li className={s.item} key={item.id}>
      <span className={s.source}>{external ? sourceLabel(item) : 'Mission InfiMatch'}</span>
      <h4>{item.title}</h4>
      <p>{item.qualification || 'Qualification non précisée'}{item.service ? ` · ${labelCode(item.service)}` : ''} · {item.location_label || item.address || 'Lieu non précisé'}</p>
      <div className={s.metadata}>
        <span>{external ? item.provenance?.salaryRaw || 'Rémunération non renseignée — voir la source' : salary(item)}</span>
        {external && item.provenance?.contract && <span>{contractLabel(item.provenance.contract)}</span>}
        {!external && <span>{item.start_at ? `${date(item.start_at)}${item.end_at ? ` — ${date(item.end_at)}` : ''}` : 'Dates de mission non précisées'}</span>}
        {item.shift && <span>{item.shift === 'DAY' ? 'Jour' : item.shift === 'NIGHT' ? 'Nuit' : 'Horaires à vérifier'}</span>}
      </div>
      <p className={u.muted}>{item.publicationDate ? `Publiée le ${date(item.publicationDate)}` : 'Date de publication non renseignée'}{item.importedAt ? ` · Importée le ${date(item.importedAt)}` : ''}</p>
      {external && item.sourceUpdatedAt && <p className={u.muted}>Mise à jour par la source le {date(item.sourceUpdatedAt)}</p>}
      {external && !!item.profileCorrespondence?.knownMismatches?.length && <p className={s.notice}>Critères en écart : vérifier le détail avant de candidater.</p>}
      <div className={s.actions}>
        <ButtonLink to={'/missions/' + item.id + (!external && item.match_explanation_id ? '?correspondance=' + encodeURIComponent(item.match_explanation_id) : '')} size="sm">{external ? 'Voir l’offre externe' : 'Voir la mission et sa compatibilité'}</ButtonLink>
        <Button variant="icon" className={s.favorite} type="button" aria-label={(isSaved(item) ? 'Retirer ' + item.title + ' des favoris' : 'Ajouter ' + item.title + ' aux favoris')} aria-pressed={isSaved(item)} disabled={busy} onClick={() => onFavorite(item)}><Icon name="heart-outline" size={21} /></Button>
      </div>
    </li>)}</ul>;
  }
  return <section className={u.card} aria-labelledby="recommendations-heading">
    <div className={u.row}><h2 id="recommendations-heading">Vos pistes de mission</h2><Link to="/missions">Toutes les offres →</Link></div>
    {result.loading ? <p role="status">Recherche de missions compatibles et d’offres externes…</p> : result.error ? <div role="alert" className={s.notice}><p>Les suggestions ne sont pas disponibles pour le moment. Vos autres informations restent accessibles.</p><Button variant="outline" onClick={result.reload}>Réessayer les suggestions</Button></div> : data && <>
      <section className={s.group} aria-labelledby="compatible-heading"><h3 id="compatible-heading">Missions compatibles</h3><p>Des missions InfiMatch qui respectent les critères de votre profil. Les plus pertinentes viennent d’abord ; à pertinence égale, les publications les plus récentes sont prioritaires. Consultez le détail pour comprendre la compatibilité.</p>
        {data.internal.status === 'UNAVAILABLE' ? <div className={s.notice} role="status"><p>La recherche de missions compatibles est temporairement indisponible.</p><Button variant="outline" onClick={result.reload}>Réessayer les missions compatibles</Button></div> : data.internal.items.length ? cards(data.internal.items, false) : <p className={u.muted}>Aucune mission compatible pour le moment. <Link to="/profil">Vérifiez votre profil</Link>, votre dossier RPPS et vos <Link to="/calendrier">disponibilités</Link>.</p>}
      </section>
      <section className={s.group} aria-labelledby="external-heading"><h3 id="external-heading">Offres externes à explorer</h3>
        {data.external.personalization === 'GENERAL_PROFILE_INCOMPLETE' ? <p className={s.notice}>Votre profil est incomplet : ces offres générales ne sont pas des recommandations personnalisées. <Link to="/profil">Compléter mon profil</Link>.</p> : <p>Une comparaison partielle avec votre profil, puis la date réelle de publication, organise ces offres. Les horaires, les prérequis et la disponibilité restent à vérifier auprès de l’annonceur. La candidature se poursuit sur le site source.</p>}
        {data.external.sources.some(source => !['SUCCESS', 'SUCCEEDED', 'READY'].includes(source.status)) && <p className={s.notice} role="status">La dernière actualisation d’au moins une source est indisponible ou incomplète. Les offres déjà enregistrées peuvent être présentées ; vérifiez leur disponibilité sur le site source.</p>}
        {data.external.status === 'UNAVAILABLE' && <div role="status" className={s.notice}><p>Les suggestions externes sont temporairement indisponibles.</p><Button variant="outline" onClick={result.reload}>Réessayer les offres externes</Button></div>}
        {data.external.items.length ? cards(data.external.items, true) : data.external.status === 'READY' && <p className={u.muted}>Aucune offre externe disponible pour le moment.</p>}
      </section>
    </>}
  </section>;
}
