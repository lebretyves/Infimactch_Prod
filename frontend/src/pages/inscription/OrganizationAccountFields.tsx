import { Link } from "react-router";
import { Checkbox } from "@/ui/Choice";
import { Button } from "@/ui/Button";
import { PasswordField, TextField } from "@/ui/Field";
import type { AccountErrors } from "./accountTypes";
import s from "../Inscription.module.css";

type Props = {
  email: string;
  motDePasse: string;
  confirmation: string;
  google: boolean;
  googleReady: boolean;
  erreurs: AccountErrors;
  enCours: boolean;
  setEmail: (value: string) => void;
  setMotDePasse: (value: string) => void;
  setConfirmation: (value: string) => void;
  cgu: boolean;
  setCgu: (value: boolean) => void;
  organizationType: "ESTABLISHMENT" | "AGENCY";
};

export function OrganizationAccountFields({
  email,
  motDePasse,
  confirmation,
  google,
  googleReady,
  erreurs,
  enCours,
  setEmail,
  setMotDePasse,
  setConfirmation,
  cgu,
  setCgu,
  organizationType,
}: Props) {
  return (
    <>
      <TextField
        label="E-mail professionnel de connexion"
        required
        icon="mail"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="contact.rh@hopital.fr"
        value={email}
        readOnly={google}
        aria-readonly={google}
        onChange={(e) => setEmail(e.target.value)}
        error={erreurs.email}
      />

      {!google && (
        <div className={s.paire}>
          <PasswordField
            label="Mot de passe"
            required
            name="password"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            placeholder="12 caractères minimum"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            error={erreurs.motDePasse}
          />
          <PasswordField
            label="Confirmer le mot de passe"
            required
            name="password-confirmation"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            placeholder="Répétez le mot de passe"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            error={erreurs.confirmation}
          />
        </div>
      )}

      <p className={s.aide}>
        Les informations nécessaires au service demandé servent à créer le
        compte de votre organisation et à faciliter la mise en relation. Ne
        transmettez aucune donnée permettant d’identifier un patient ni aucune
        donnée de santé concernant un patient.
      </p>

      <div className={s.consentement}>
        <Checkbox
          name="cgu"
          checked={cgu}
          onChange={(e) => setCgu(e.currentTarget.checked)}
          required
        >
          J'accepte les{" "}
          <Link
            to="/mentions-legales#conditions"
            target="_blank"
            rel="noopener noreferrer"
          >
            conditions d'utilisation
          </Link>{" "}
          d'InfiMatch.
        </Checkbox>

        <p className={s.aide}>
          Consultez la{" "}
          <Link
            to="/mentions-legales#confidentialite"
            target="_blank"
            rel="noopener noreferrer"
          >
            politique de confidentialité
          </Link>{" "}
          pour connaître l'usage de vos données.
        </p>

        {erreurs.cgu && (
          <p className={s.erreur} role="alert">
            {erreurs.cgu}
          </p>
        )}
      </div>

      <Button
        type="submit"
        block
        size="lg"
        loading={enCours}
        disabled={google && !googleReady}
      >
        Créer le compte{" "}
        {organizationType === "AGENCY" ? "agence" : "établissement"}
      </Button>
    </>
  );
}
