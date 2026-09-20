import {useEffect, useRef, useState} from 'react';
import {api} from '@/services/api';
import {Button} from '@/ui/Button';
import { TextField } from '@/ui/Field';
import { Etape, etapeStyles as s } from './Etape';
import { useInscription } from './state';

export default function Localisation() {
  const { valeurs, modifier } = useInscription();
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const request=useRef<AbortController | null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);

  function edit(changes: Partial<typeof valeurs>) {
    request.current?.abort();
    setBusy(false);
    setNotice('');
    setError('');
    // A manually changed address must not retain coordinates for another place.
    modifier({...changes, latitude:null, longitude:null});
  }

  async function locate() {
    request.current?.abort();
    const controller=new AbortController();
    request.current=controller;
    setError('');setNotice('');
    if(!navigator.geolocation){setError('La géolocalisation est indisponible sur cet appareil. Saisissez votre adresse manuellement.');return;}
    setBusy(true);
    try {
      const position=await new Promise<GeolocationPosition>((resolve,reject)=>
        navigator.geolocation.getCurrentPosition(resolve,reject,{timeout:10000,maximumAge:0}));
      if(controller.signal.aborted)return;
      const coordinates={latitude:position.coords.latitude,longitude:position.coords.longitude};
      setNotice('Position obtenue. Recherche de l’adresse…');
      try {
        const result=await api<{address:{address:string;postalCode:string;city:string}|null}>(
          '/listings/locations/reverse',{method:'POST',body:coordinates,signal:controller.signal});
        if(controller.signal.aborted)return;
        if(result.address){
          modifier({...coordinates,adresse:result.address.address,codePostal:result.address.postalCode,ville:result.address.city});
          setNotice(result.address.address
            ? 'Adresse proposée à partir de votre position. Vérifiez qu’elle correspond à votre domicile et corrigez-la si nécessaire.'
            : 'Ville et code postal trouvés. Complétez le numéro et la rue de votre domicile.');
        }else{
          setNotice('Position obtenue, mais aucune adresse trouvée à proximité. Saisissez votre adresse manuellement.');
        }
      }catch{
        if(!controller.signal.aborted)setNotice('Position obtenue, mais la recherche d’adresse est indisponible. Saisissez votre adresse manuellement.');
      }
    }catch(e){
      if(!controller.signal.aborted)setError((e as GeolocationPositionError).code===1
        ? 'Autorisez la localisation dans votre navigateur ou saisissez votre adresse manuellement.'
        : 'Position indisponible. Réessayez ou saisissez votre adresse manuellement.');
    }finally{
      if(!controller.signal.aborted)setBusy(false);
    }
  }

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
        onChange={(e) => edit({ adresse: e.target.value })}
      />

      <div className={s.paire}>
        <TextField
          label="Code postal" required pattern="[0-9]{5}"
          inputMode="numeric"
          autoComplete="postal-code"
          width="sm"
          placeholder="44000"
          value={valeurs.codePostal}
          onChange={(e) => edit({ codePostal: e.target.value })}
        />
        <TextField
          label="Ville" required
          autoComplete="address-level2"
          placeholder="Nantes"
          value={valeurs.ville}
          onChange={(e) => edit({ ville: e.target.value })}
        />
      </div>
      <Button type="button" variant="outline" disabled={busy} onClick={locate}>
        {busy ? 'Localisation en cours…' : 'Utiliser ma position'}
      </Button>
      <p>À votre demande, votre position est transmise au service d’adresses de l’IGN pour proposer une adresse.</p>
      <p role="status">{notice}</p>
      {valeurs.latitude!==null&&valeurs.longitude!==null&&<p>Position enregistrée pour le calcul des distances.</p>}
      {error&&<p role="alert">{error}</p>}
      <p>Vous pouvez poursuivre sans position ; les critères de distance resteront à compléter.</p>
    </Etape>
  );
}
