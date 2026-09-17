import {useState} from 'react';
import {Button} from '@/ui/Button';
import { TextField } from '@/ui/Field';
import { Etape, etapeStyles as s } from './Etape';
import { useInscription } from './state';

export default function Localisation() {
  const { valeurs, modifier } = useInscription();
  const [error,setError]=useState('');

  return (
    <Etape
      titre="Localisation"
      chapeau="Renseignez votre ville et votre adresse. Votre position permet de calculer les distances des missions."
      suivant="/inscription/qualification"
    >
      <TextField
        label="Adresse" required
        autoComplete="street-address"
        placeholder="12 rue des Olivettes"
        value={valeurs.adresse}
        onChange={(e) => modifier({ adresse: e.target.value })}
      />

      <div className={s.paire}>
        <TextField
          label="Code postal" required pattern="[0-9]{5}"
          inputMode="numeric"
          autoComplete="postal-code"
          width="sm"
          placeholder="44000"
          value={valeurs.codePostal}
          onChange={(e) => modifier({ codePostal: e.target.value })}
        />
        <TextField
          label="Ville" required
          autoComplete="address-level2"
          placeholder="Nantes"
          value={valeurs.ville}
          onChange={(e) => modifier({ ville: e.target.value })}
        />
      </div>
      <Button type="button" variant="outline" onClick={()=>{setError('');if(!navigator.geolocation){setError('La géolocalisation est indisponible sur cet appareil.');return;}navigator.geolocation.getCurrentPosition(p=>modifier({latitude:p.coords.latitude,longitude:p.coords.longitude}),()=>setError('Position indisponible. Vous pourrez la compléter dans votre profil.'),{timeout:10000});}}>Utiliser ma position</Button>
      {valeurs.latitude!==null&&valeurs.longitude!==null&&<p>Position enregistrée pour le calcul des distances.</p>}
      {error&&<p role="alert">{error}</p>}
      <p>Vous pouvez poursuivre sans position ; les critères de distance resteront à compléter.</p>
    </Etape>
  );
}
