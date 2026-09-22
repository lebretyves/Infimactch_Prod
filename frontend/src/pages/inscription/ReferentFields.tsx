import { TextField } from "@/ui/Field";
import type { AccountErrors } from "./accountTypes";
import s from "../Inscription.module.css";

type Props = {
  referentPrenom: string;
  setReferentPrenom: (value: string) => void;
  referentNom: string;
  setReferentNom: (value: string) => void;
  referentFonction: string;
  setReferentFonction: (value: string) => void;
  referentTelephone: string;
  setReferentTelephone: (value: string) => void;
  erreurs: AccountErrors;
};

export function ReferentFields({
  referentPrenom,
  setReferentPrenom,
  referentNom,
  setReferentNom,
  referentFonction,
  setReferentFonction,
  referentTelephone,
  setReferentTelephone,
  erreurs,
}: Props) {
  return (
    <>
      <h2 className={s.sectionTitre}>Coordonnées du référent</h2>

      <div className={s.paire}>
        <TextField
          label="Prénom du référent"
          required
          icon="user"
          name="referentPrenom"
          placeholder="Prénom"
          value={referentPrenom}
          onChange={(e) => setReferentPrenom(e.target.value)}
          error={erreurs.referentPrenom}
        />
        <TextField
          label="Nom du référent"
          required
          icon="user"
          name="referentNom"
          placeholder="Nom"
          value={referentNom}
          onChange={(e) => setReferentNom(e.target.value)}
          error={erreurs.referentNom}
        />
      </div>

      <div className={s.paire}>
        <TextField
          label="Fonction / Poste"
          required
          name="referentFonction"
          placeholder="Ex : Directeur des soins, Cadre RH"
          value={referentFonction}
          onChange={(e) => setReferentFonction(e.target.value)}
          error={erreurs.referentFonction}
        />
        <TextField
          label="Téléphone direct"
          required
          type="tel"
          name="referentTelephone"
          placeholder="02 40 00 00 00"
          value={referentTelephone}
          onChange={(e) => setReferentTelephone(e.target.value)}
          error={erreurs.referentTelephone}
        />
      </div>
    </>
  );
}
