import { Button } from "@/ui/Button";
import { SelectField, TextField } from "@/ui/Field";
import type { Dispatch, SetStateAction } from "react";
import type {
  AccountErrors,
  FinessState,
  OrganizationField,
} from "./accountTypes";
import s from "../Inscription.module.css";

const referenceDate = (value?: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
        new Date(value),
      )
    : "";

type Props = {
  organizationType: "ESTABLISHMENT" | "AGENCY";
  setOrganizationType: (value: "ESTABLISHMENT" | "AGENCY") => void;
  finess: string;
  finessState: FinessState;
  changeFiness: (value: string) => void;
  setFinessVersion: Dispatch<SetStateAction<number>>;
  siret: string;
  setSiret: (value: string) => void;
  nomEtablissement: string;
  adresse: string;
  codePostal: string;
  villeEtablissement: string;
  editOrganizationField: (field: OrganizationField, value: string) => void;
  erreurs: AccountErrors;
};

export function OrganizationFields({
  organizationType,
  setOrganizationType,
  finess,
  finessState,
  changeFiness,
  setFinessVersion,
  siret,
  setSiret,
  nomEtablissement,
  adresse,
  codePostal,
  villeEtablissement,
  editOrganizationField,
  erreurs,
}: Props) {
  return (
    <>
      <SelectField
        label="Type d’organisation"
        value={organizationType}
        onChange={(e) =>
          setOrganizationType(e.target.value as "AGENCY" | "ESTABLISHMENT")
        }
      >
        <option value="ESTABLISHMENT">Établissement de santé</option>
        <option value="AGENCY">Agence d’intérim</option>
      </SelectField>
      <h2 className={s.sectionTitre}>Coordonnées de l’organisation</h2>

      {organizationType === "ESTABLISHMENT" ? (
        <section
          className={s.finessLookup}
          aria-label="Identifier mon établissement"
        >
          <TextField
            label="Numéro FINESS"
            required
            icon="building"
            name="finess"
            autoComplete="off"
            spellCheck={false}
            placeholder="Ex : 010000024"
            hint="Saisissez les 9 caractères pour retrouver automatiquement votre établissement."
            value={finess}
            onChange={(e) => changeFiness(e.target.value)}
            error={erreurs.finess}
          />
          <div aria-live="polite" aria-atomic="true">
            {finessState.state === "loading" && (
              <p className={s.finessNotice} role="status">
                Recherche dans le répertoire FINESS…
              </p>
            )}
            {finessState.state === "found" &&
              finessState.data?.establishment && (
                <div className={s.finessResult}>
                  <p className={s.finessTitle}>Établissement trouvé</p>
                  <strong>{finessState.data.establishment.name}</strong>
                  <p>
                    {[
                      finessState.data.establishment.address,
                      finessState.data.establishment.postal_code,
                      finessState.data.establishment.city,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {Number.isFinite(finessState.data.establishment.latitude) &&
                    Number.isFinite(
                      finessState.data.establishment.longitude,
                    ) && (
                      <p className={s.finessSource}>
                        Localisation : latitude{" "}
                        {Number(
                          finessState.data.establishment.latitude,
                        ).toLocaleString("fr-FR", {
                          maximumFractionDigits: 6,
                        })}
                        , longitude{" "}
                        {Number(
                          finessState.data.establishment.longitude,
                        ).toLocaleString("fr-FR", {
                          maximumFractionDigits: 6,
                        })}
                        .
                      </p>
                    )}
                  <p className={s.finessSource}>
                    Répertoire FINESS
                    {referenceDate(finessState.data.generated_at)
                      ? " · données du " +
                        referenceDate(finessState.data.generated_at)
                      : ""}
                    .
                  </p>
                  <p className={s.finessHelp}>
                    Les champs vides ont été préremplis. Vos saisies
                    personnelles sont conservées et restent modifiables.
                  </p>
                </div>
              )}
            {finessState.state === "missing" && (
              <p className={s.finessNotice}>
                Cet établissement n’a pas été trouvé dans la version du
                répertoire disponible. Vérifiez le numéro ou renseignez les
                coordonnées ci-dessous.
              </p>
            )}
            {finessState.state === "error" && (
              <div className={s.finessNotice}>
                <p>
                  Le répertoire FINESS est momentanément indisponible. Vous
                  pouvez renseigner les coordonnées manuellement.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFinessVersion((version) => version + 1)}
                >
                  Réessayer la recherche FINESS
                </Button>
              </div>
            )}
          </div>
          <p className={s.finessHelp}>
            Cette recherche identifie la structure et ne donne pas accès à un
            compte existant. Le référent est à renseigner séparément.
          </p>
        </section>
      ) : (
        <TextField
          label="SIRET"
          optional
          maxLength={14}
          pattern="[0-9]{14}"
          value={siret}
          onChange={(e) => setSiret(e.target.value)}
          error={erreurs.siret}
        />
      )}

      <TextField
        label="Nom de l’organisation"
        required
        icon="building"
        name="nomEtablissement"
        placeholder="Ex : Centre Hospitalier Universitaire de Nantes"
        value={nomEtablissement}
        onChange={(e) => editOrganizationField("name", e.target.value)}
        error={erreurs.nomEtablissement}
      />

      <TextField
        label="Adresse de l'établissement"
        required
        name="adresse"
        autoComplete="street-address"
        placeholder="Numéro et nom de rue"
        value={adresse}
        onChange={(e) => editOrganizationField("address", e.target.value)}
        error={erreurs.adresse}
      />

      <div className={s.paire}>
        <TextField
          label="Code postal"
          required
          name="codePostal"
          autoComplete="postal-code"
          placeholder="44000"
          value={codePostal}
          onChange={(e) => editOrganizationField("postalCode", e.target.value)}
          error={erreurs.codePostal}
        />
        <TextField
          label="Ville"
          required
          icon="map-pin"
          name="villeEtablissement"
          autoComplete="address-level2"
          placeholder="Nantes"
          value={villeEtablissement}
          onChange={(e) => editOrganizationField("city", e.target.value)}
          error={erreurs.villeEtablissement}
        />
      </div>
    </>
  );
}
