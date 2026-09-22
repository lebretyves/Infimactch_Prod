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
};

export function CandidateAccountFields({
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
}: Props) {
  return (
    <>
      <TextField
        label="Adresse e-mail de connexion"
        required
        icon="mail"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="vous@exemple.fr"
        value={email}
        readOnly={google}
        aria-readonly={google}
        onChange={(e) => setEmail(e.target.value)}
        error={erreurs.email}
        hint={
          google
            ? "Adresse vérifiée par Google. Pour en changer, reprenez avec un autre compte Google."
            : "Cette adresse servira d’identifiant unique de connexion."
        }
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

      <div
        style={{
          background: "var(--sky-50)",
          border: "1px solid var(--sky-200)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
          fontSize: "var(--font-body-sm)",
          color: "var(--ink-700)",
        }}
      >
        <strong>Parcours en étapes :</strong> Vos coordonnées civiles (nom,
        prénom), diplômes et disponibilités seront renseignés aux étapes
        suivantes.
      </div>

      <Button
        type="submit"
        block
        size="lg"
        loading={enCours}
        disabled={google && !googleReady}
      >
        Continuer mon inscription
      </Button>
    </>
  );
}
