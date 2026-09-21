import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useRemote } from '@/lib/useRemote';
import { staffingNeed } from '@/services/needs';
import { Button, ButtonLink } from '@/ui/Button';

export default function LegacyNeedRedirect() {
  const { hash } = useLocation();
  const { user } = useAuth();
  const id = /^#besoin-([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i.exec(hash)?.[1];
  const allowed = user?.role === 'entreprise' || user?.role === 'etablissement';
  const record = useRemote(signal => id && allowed ? staffingNeed(id, signal) : Promise.resolve(null), `${user?.id}:${id}`);
  if (!id || !allowed) return <Navigate to="/missions" replace />;
  if (record.loading) return <p role="status">Ouverture de la mission…</p>;
  if (record.error) return <div role="alert"><p>Cette ancienne annonce n’est pas accessible.</p><Button onClick={record.reload}>Réessayer</Button><ButtonLink to="/missions">Retour aux missions</ButtonLink></div>;
  // An old bookmark must not create a duplicate of an already published mission.
  const mission = record.data?.missions?.[0];
  return <Navigate to={mission ? '/gestion/missions/' + mission.id : '/gestion/missions/nouvelle?' + new URLSearchParams({ besoin: id })} replace />;
}
