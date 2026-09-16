import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button, ButtonLink } from '@/ui/Button';
import { usePageTitle } from '@/lib/usePageTitle';
import { etapes } from './state';
import s from './Etape.module.css';

type Props = {
  titre: string;
  chapeau: string;
  suivant: string;
  precedent?: string;
  libelleSuivant?: string;
  bloqueSuivant?: boolean;
  onValider?: () => void | Promise<void>;
  children: ReactNode;
};

export function Etape({
  titre,
  chapeau,
  suivant,
  precedent,
  libelleSuivant = 'Continuer',
  bloqueSuivant,
  onValider,
  children,
}: Props) {
  usePageTitle(`Inscription — ${titre}`);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function soumettre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || bloqueSuivant || !event.currentTarget.reportValidity()) return;
    setBusy(true);
    setError('');
    try {
      await onValider?.();
      navigate(suivant);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const rang = etapes.findIndex((etape) => etape.path === pathname);
  const retour =
    precedent ?? (rang > 0 ? etapes[rang - 1].path : '/inscription');

  return (
    <form onSubmit={soumettre}>
      <h1 className={s.titre}>{titre}</h1>
      <p className={s.chapeau}>{chapeau}</p>
      <p className={s.obligatoire}>
        Les champs marqués d'un <span className={s.etoile}>*</span> sont
        obligatoires.
      </p>

      {error && <p role="alert">{error}</p>}
      <div className={s.champs}>{children}</div>

      <div className={s.actions}>
        <ButtonLink to={retour} variant="ghost">
          Retour
        </ButtonLink>
        <Button type="submit" size="lg" disabled={bloqueSuivant || busy}>
          {libelleSuivant}
        </Button>
      </div>
    </form>
  );
}

export { s as etapeStyles };
