import { ButtonLink } from '@/ui/Button';
import s from './Confirmation.module.css';

export function DiscordInvitation() {
  return <>
    <div className={s.prochaineEtape}>
      <p className={s.etapeLabel}>Étape facultative</p>
      <h2 className={s.etapeTitre}>Recevoir mes notifications sur Discord</h2>
      <p>Configurez Discord pour recevoir les événements que vous choisissez. Votre compte est déjà utilisable sans Discord et vos notifications restent disponibles dans InfiMatch.</p>
      <p>Vous pourrez modifier ce choix plus tard dans la rubrique Notifications.</p>
    </div>
    <div className={s.actions}>
      <ButtonLink to="/notifications?bienvenue=1" size="lg" block>Configurer Discord</ButtonLink>
      <ButtonLink to="/accueil" variant="outline" block>Passer cette étape</ButtonLink>
    </div>
  </>;
}
