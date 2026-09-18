import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { Logo } from '@/ui/Logo';
import { enregistrer, InscriptionContext, charger, etapes, type Inscription } from './state';
import s from './InscriptionLayout.module.css';

export function InscriptionLayout() {
  const { pathname } = useLocation();
  const [valeurs, setValeurs] = useState(charger);

  const index = Math.max(
    etapes.findIndex((etape) => etape.path === pathname),
    0,
  );

  function modifier(champs: Partial<Inscription>) {
    setValeurs((precedent) => {
      const suivant = { ...precedent, ...champs };
      try {
        enregistrer(suivant);
      } catch {
        // stockage indisponible : le parcours reste utilisable, sans reprise
      }
      return suivant;
    });
  }

  return (
    <div className={s.shell}>
      <a className="skipLink" href="#contenu">
        Aller au contenu principal
      </a>

      <header className={s.header}>
        <Logo size={32} withWordmark />
        <p className={s.compteur}>
          Étape {index + 1} sur {etapes.length}
        </p>
      </header>

      <div className={s.jauge}>
        <div
          className={s.avancement}
          style={{ width: `${((index + 1) / etapes.length) * 100}%` }}
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={etapes.length}
          aria-label="Avancement de l'inscription"
        />
      </div>

      <div className={s.body}>
        <nav className={s.etapes} aria-label="Étapes de l'inscription">
          {etapes.map((etape, rang) => {
            const classe = [
              s.etape,
              rang < index && s.faite,
              rang === index && s.courante,
            ]
              .filter(Boolean)
              .join(' ');

            const contenu = (
              <>
                <span className={s.pastille} aria-hidden="true">
                  {rang < index ? '✓' : rang + 1}
                </span>
                {etape.titre}
              </>
            );

            return rang < index ? (
              <Link key={etape.path} to={etape.path} className={classe}>
                {contenu}
              </Link>
            ) : (
              <span
                key={etape.path}
                className={classe}
                aria-disabled={rang > index || undefined}
                aria-current={rang === index ? 'step' : undefined}
              >
                {contenu}
              </span>
            );
          })}
        </nav>

        <main className={s.form} id="contenu">
          <p>Le brouillon est effacé après 30 minutes sans modification et au plus tard après 2 heures.</p>
          <InscriptionContext value={{ valeurs, modifier }}>
            <Outlet />
          </InscriptionContext>
        </main>
      </div>
    </div>
  );
}

export { s as inscriptionStyles };
