import { Radio } from "@/ui/Choice";
import { TextField } from "@/ui/Field";
import { shiftOptions } from "@/data/professional";
import { wholeDayPeriod } from "@/lib/datePeriods";
import { Etape, etapeStyles as s } from "./Etape";
import { useInscription } from "./state";
export default function Disponibilites() {
  const { valeurs: v, modifier } = useInscription();
  return (
    <Etape
      titre="Disponibilités"
      chapeau="Choisissez vos horaires et, si vous les connaissez, vos premières dates de disponibilité."
      suivant="/inscription/consentements"
      onValider={() => {
        if (
          (v.disponibleDes || v.disponibleFin) &&
          !wholeDayPeriod(v.disponibleDes, v.disponibleFin)
        )
          throw new Error("Vérifiez les dates de début et de fin.");
      }}
    >
      <fieldset className={s.bloc}>
        <legend>Horaires acceptés</legend>
        {shiftOptions.map((o) => (
          <Radio
            key={o.value}
            name="horaires-inscription"
            value={o.value}
            checked={v.horaire === o.value}
            onChange={() => modifier({ horaire: o.value })}
          >
            {o.label}
          </Radio>
        ))}
      </fieldset>
      <div className={s.paire}>
        <TextField
          label="Disponible du"
          type="date"
          optional
          value={v.disponibleDes}
          onChange={(e) => modifier({ disponibleDes: e.target.value })}
        />
        <TextField
          label="Disponible jusqu’au"
          type="date"
          optional
          min={v.disponibleDes || undefined}
          value={v.disponibleFin}
          onChange={(e) => modifier({ disponibleFin: e.target.value })}
        />
      </div>
      <p>
        Les deux dates sont incluses. Vous pourrez ajouter d’autres périodes
        dans votre calendrier.
      </p>
    </Etape>
  );
}
