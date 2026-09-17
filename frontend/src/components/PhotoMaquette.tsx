import s from './PhotoMaquette.module.css';

type Props = { variante: 'accueil' | 'connexion' | 'inscription'; className?: string };

/** Affichage cadré des pixels des maquettes, sans retouche des photographies. */
export function PhotoMaquette({ variante, className }: Props) {
  const accueil = variante === 'accueil';
  return (
    <div className={[s.cadre, accueil ? s.accueil : s.soignantes, variante === 'inscription' && s.inscription, className].filter(Boolean).join(' ')}>
      <img
        src={accueil ? '/images/maquette-accueil-source.png' : '/images/maquette-connexion-source.png'}
        alt={accueil ? 'Trois professionnels de santé réunis dans un hôpital.' : 'Deux soignantes échangent autour d’une tablette dans un hôpital.'}
        width={1448}
        height={1086}
        loading={variante === 'inscription' ? 'lazy' : 'eager'}
        decoding="async"
      />
    </div>
  );
}
