import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '@/ui/Logo';
import s from './Confirmation.module.css';

export function ConfirmationLayout({ children }: { children: ReactNode }) {
  return (
    <main className={s.page}>
      <div className={s.contenu}>
        <Link to="/" className={s.marque} aria-label="InfiMatch — accueil">
          <Logo size={38} withWordmark />
        </Link>
        <section className={s.carte} aria-labelledby="confirmation-titre">
          {children}
        </section>
        <p className={s.signature}>Les missions de santé, simplement.</p>
      </div>
    </main>
  );
}

export function ConfirmationSuccess() {
  return (
    <div className={s.succes} aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}