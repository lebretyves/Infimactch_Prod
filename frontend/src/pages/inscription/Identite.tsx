import { TextField } from '@/ui/Field';
import { Etape, etapeStyles as s } from './Etape';
import { useInscription } from './state';

export default function Identite() {
  const { valeurs, modifier } = useInscription();

  return (
    <Etape
      titre="Identité"
      chapeau="Ces informations permettent de vous identifier dans votre espace."
      suivant="/inscription/localisation"
    >
      <div className={s.paire}>
        <TextField
          label="Prénom" required
          autoComplete="given-name"
          value={valeurs.prenom}
          onChange={(e) => modifier({ prenom: e.target.value })}
        />
        <TextField
          label="Nom" required
          autoComplete="family-name"
          value={valeurs.nom}
          onChange={(e) => modifier({ nom: e.target.value })}
        />
      </div>

      <div className={s.paire}>
        <TextField
          label="Date de naissance" required
          type="date" autoComplete="bday" max={new Date().toISOString().slice(0,10)}
          width="md"
          value={valeurs.naissance}
          onChange={(e) => modifier({ naissance: e.target.value })}
        />
        <TextField
          label="Téléphone" required
          type="tel"
          autoComplete="tel"
          width="md"
          placeholder="06 12 34 56 78"
          value={valeurs.telephone}
          onChange={(e) => modifier({ telephone: e.target.value })}
        />
      </div>


    </Etape>
  );
}
