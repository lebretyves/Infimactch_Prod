import { ButtonLink } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { usePageTitle } from '@/lib/usePageTitle';
import s from './ASuivre.module.css';

export default function ASuivre({ titre }: { titre: string }) {
  usePageTitle(titre);

  return (
    <div className={s.page}>
      <div className={s.bloc}>
        <span className={s.marque} aria-hidden="true">
          <Icon name="nav-booking" size={28} />
        </span>
        <h1>{titre}</h1>
        <p>
          Cette section fait partie du périmètre V1 mais n'est pas encore implémentée. Elle arrive
          dans le prochain lot.
        </p>
        <ButtonLink to="/accueil" variant="outline">
          Retour au tableau de bord
        </ButtonLink>
      </div>
    </div>
  );
}
