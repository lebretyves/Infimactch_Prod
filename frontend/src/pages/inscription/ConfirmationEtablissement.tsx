import { DiscordInvitation } from './DiscordInvitation';
import { useAuth } from '@/context/AuthContext';
import { usePageTitle } from '@/lib/usePageTitle';
import { Button, ButtonLink } from '@/ui/Button';
import { ConfirmationLayout, ConfirmationSuccess } from './ConfirmationLayout';
import s from './Confirmation.module.css';
import e from './ConfirmationEtablissement.module.css';

export default function ConfirmationEtablissement() {
  const { user, isLoading, error, refresh } = useAuth();
  usePageTitle('Confirmation du compte établissement');

  if (isLoading)
    return (
      <ConfirmationLayout>
        <h1 id="confirmation-titre" className={s.titre}>Un instant…</h1>
        <p className={s.chapeau} role="status">Vérification de votre compte en cours.</p>
      </ConfirmationLayout>
    );

  if (!user)
    return (
      <ConfirmationLayout>
        <p className={s.repere}>Votre compte InfiMatch</p>
        <h1 id="confirmation-titre" className={s.titre}>Retrouvons votre compte</h1>
        <p className={s.chapeau} role="alert">
          {error || 'Votre session n’est pas disponible. Connectez-vous avec les identifiants du compte créé.'}
        </p>
        <div className={s.actions}>
          <ButtonLink to="/connexion" size="lg" block>Me connecter</ButtonLink>
          <Button variant="ghost" onClick={() => void refresh()}>Vérifier à nouveau</Button>
        </div>
      </ConfirmationLayout>
    );

  return (
    <ConfirmationLayout>
      <ConfirmationSuccess />
      <p className={s.repere}>Bienvenue sur InfiMatch</p>
      <h1 id="confirmation-titre" className={s.titre}>Votre compte {user.role==='etablissement'?'établissement':'agence'} est créé</h1>
      <p className={s.chapeau}>
        Vous êtes inscrit avec l’adresse
        <span className={s.email}>{user.email}</span>
      </p>
      <dl className={e.recapitulatif}>
        <div className={e.ligne}>
          <dt>Organisation</dt>
          <dd>{user.nomEtablissement || 'Non renseigné'}</dd>
        </div>
        <div className={e.ligne}>
          <dt>{user.role==='etablissement'?'FINESS enregistré':'SIRET'}</dt>
          <dd>{(user.role==='etablissement'?user.finess:user.siret) || 'Non renseigné'}</dd>
        </div>
      </dl>
      <p className={e.precision}>L’inscription ne constitue pas une certification de l’établissement.</p>
      <DiscordInvitation />
    </ConfirmationLayout>
  );
}