import type { ReactNode } from 'react';
import s from './EcranPublic.module.css';

type Props = {
  entete: ReactNode;
  children: ReactNode;
  accessibilityInHeader?: boolean;
};

export function EcranPublic({ entete, children, accessibilityInHeader = false }: Props) {
  return (
    <div className={s.page}>
      <a className="skipLink" href="#contenu">
        Aller au contenu principal
      </a>

      <header className={s.entete}>
        <div className={s.barre}>{!accessibilityInHeader && <span data-accessibility-slot />}<div className={s.headerContent}>{entete}</div></div>
      </header>

      {children}
    </div>
  );
}
