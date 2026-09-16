import { PhotoMaquette } from '@/components/PhotoMaquette';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '@/ui/Logo';
import { EcranPublic } from './EcranPublic';
import s from './EcranAuth.module.css';

type Props = {
  lien: ReactNode;
  promo: ReactNode;
  formulaireLarge?: boolean;
  photoMaquette?: 'connexion' | 'inscription';
  children: ReactNode;
};

export function EcranAuth({ lien, promo, formulaireLarge, photoMaquette, children }: Props) {
  return (
    <EcranPublic
      entete={
        <>
          <Link to="/" className={s.marque} aria-label="InfiMatch, retour à l'accueil">
            <Logo size={38} withWordmark />
          </Link>
          {lien}
        </>
      }
    >
      <div className={[s.split, formulaireLarge && s.large, photoMaquette && s.avecPhoto].filter(Boolean).join(' ')}>
        <aside className={s.promo}>
          <div className={s.promoInterieur}>
            {promo}
            {photoMaquette && <PhotoMaquette variante={photoMaquette} />}
          </div>
        </aside>

        <main className={s.formulaire} id="contenu">
          <div className={s.interieur}>{children}</div>
        </main>
      </div>
    </EcranPublic>
  );
}

export { s as authStyles };
