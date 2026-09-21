import { useState } from 'react';
import { useRemote } from '@/lib/useRemote';
import { staffingNeeds } from '@/services/needs';
import { Button, ButtonLink } from '@/ui/Button';

// Existing unpublished records remain recoverable through the mission form.
// New announcements are created only through /missions/open.
export function LegacyMissionDrafts({ userId, establishmentId, returnTo }: {
  userId: string; establishmentId?: string; returnTo: string;
}) {
  const [offset, setOffset] = useState(0);
  const records = useRemote(signal => staffingNeeds(offset, signal), `${userId}:${offset}`);
  const drafts = records.data?.filter(record => !record.missions?.length &&
    (!establishmentId || record.establishment_id === establishmentId)) || [];
  if (records.loading) return null;
  if (records.error) return <p role="alert">Les anciennes annonces à compléter sont indisponibles. <Button variant="ghost" onClick={records.reload}>Réessayer</Button></p>;
  const next = records.data?.length === 20;
  if (!drafts.length && !offset && !next) return null;
  return <section aria-labelledby="legacy-mission-drafts">
    <h2 id="legacy-mission-drafts">Annonces à compléter</h2>
    <p>Ces saisies antérieures ne sont pas publiées. Complétez les informations manquantes pour publier une mission.</p>
    {drafts.map(draft => <article key={draft.id}>
      <h3>{draft.title}</h3>
      <p>{draft.establishment_name}</p>
      <ButtonLink to={'/gestion/missions/nouvelle?' + new URLSearchParams({ besoin: draft.id, returnTo })} variant="outline">Compléter et publier</ButtonLink>
    </article>)}
    {!drafts.length && <p>Aucune annonce à compléter pour cet établissement sur cette page d’anciens enregistrements.</p>}
    {(offset > 0 || next) && <nav aria-label="Pages des anciennes annonces">
      <Button variant="ghost" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 20))}>Précédent</Button>
      <span>Page {offset / 20 + 1}</span>
      <Button variant="ghost" disabled={!next} onClick={() => setOffset(value => value + 20)}>Suivant</Button>
    </nav>}
  </section>;
}
