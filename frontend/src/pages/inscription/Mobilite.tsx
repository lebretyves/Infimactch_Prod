import { SelectField } from '@/ui/Field';
import { Etape } from './Etape';
import { useInscription } from './state';
import s from './Mobilite.module.css';

export default function Mobilite() {
  const { valeurs, modifier } = useInscription();

  return (
    <Etape
      titre="Mobilité"
      chapeau="Définissez la distance que vous acceptez de parcourir. Ce rayon sert à vérifier la distance des missions lorsque votre position est renseignée."
      suivant="/inscription/disponibilites"
    >
      <div className={s.rayon}>
        <label className={s.label} htmlFor="rayon">
          Rayon de déplacement
        </label>

        <div className={s.ligne}>
          <input
            className={s.curseur}
            id="rayon"
            type="range"
            min={5}
            max={150}
            step={5}
            value={valeurs.rayonKm}
            onChange={(e) => modifier({ rayonKm: Number(e.target.value) })}
            aria-describedby="rayon-retour"
          />
          <output className={s.valeur} htmlFor="rayon">
            {valeurs.rayonKm} km
          </output>
        </div>

        <p className={s.retour} id="rayon-retour" aria-live="polite">
          Rayon de mobilité défini à {valeurs.rayonKm} km autour de votre position enregistrée.
        </p>
      </div>

      <SelectField
        label="Moyen de transport"
        width="lg"
        value={valeurs.transport}
        onChange={(e) => modifier({ transport: e.target.value })}
      >
        <option>Véhicule personnel</option>
        <option>Transports en commun</option>
        <option>Deux-roues</option>
      </SelectField>
    </Etape>
  );
}
