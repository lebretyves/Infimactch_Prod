import s from './PhotoMaquette.module.css';
import media from '@/assets/public-media.json';

type Props = { variante: 'accueil' | 'connexion' | 'inscription'; className?: string; loading?: 'lazy' | 'eager' };

/** Same source photographs and framing; only the visible crop is downloaded. */
export function PhotoMaquette({ variante, className, loading }: Props) {
  const accueil = variante === 'accueil';
  const image = accueil ? media.accueil : media.soignantes;
  return (
    <div className={[s.cadre, accueil ? s.accueil : s.soignantes, variante === 'inscription' && s.inscription, className].filter(Boolean).join(' ')}>
      <img
        src={image.src}
        srcSet={image.srcSet}
        sizes={image.sizes}
        alt={accueil ? 'Trois professionnels de santé réunis dans un hôpital.' : 'Deux soignantes échangent autour d’une tablette dans un hôpital.'}
        width={image.width}
        height={image.height}
        loading={loading ?? (variante === 'inscription' ? 'lazy' : 'eager')}
        fetchPriority={accueil ? 'high' : 'auto'}
        decoding="async"
      />
    </div>
  );
}
