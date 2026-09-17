import { useAuth } from '@/context/AuthContext';
import { usePageTitle } from '@/lib/usePageTitle';
import { Button, ButtonLink } from '@/ui/Button';
import { ConfirmationLayout, ConfirmationSuccess } from './ConfirmationLayout';
import s from './Confirmation.module.css';

export default function Confirmation() {
  const { user, isLoading, error, refresh } = useAuth();
  usePageTitle('Confirmation de votre compte');

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
          {error || 'Votre session n’est pas disponible. Si vous venez de créer votre compte, connectez-vous avec vos identifiants pour le retrouver.'}
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
      <h1 id="confirmation-titre" className={s.titre}>Votre compte est créé</h1>
      <p className={s.chapeau}>
        Vous êtes inscrit avec l’adresse
        <span className={s.email}>{user.email}</span>
      </p>
      <div className={s.prochaineEtape}>
        <p className={s.etapeLabel}>La prochaine étape</p>
        <h2 className={s.etapeTitre}>Préparez votre profil</h2>
        <p>Complétez votre profil professionnel et vos disponibilités avant de candidater.</p>
      </div>
      <div className={s.actions}>
        <ButtonLink to="/profil" size="lg" block>Compléter mon profil <span aria-hidden="true">→</span></ButtonLink>
        <ButtonLink to="/accueil" variant="ghost">Accéder à mon espace</ButtonLink>
      </div>
    </ConfirmationLayout>
  );
}