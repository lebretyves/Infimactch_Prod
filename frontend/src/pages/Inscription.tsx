import { MatchingReminder } from "@/components/MatchingReminder";
﻿import { api, ApiError } from "@/services/api";
import { GoogleConnexion } from "@/components/GoogleConnexion";
import { AccountCreatedError } from "@/services/auth";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  isCompleteFiness,
  lookupFiness,
  normalizeFiness,
  type FinessLookup,
} from "@/services/finess";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router";
import { EcranAuth, authStyles as a } from "@/layouts/EcranAuth";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Choice";
import { ChoixRole, type Role } from "@/ui/ChoixRole";
import { PasswordField, TextField, SelectField } from "@/ui/Field";
import { enregistrer, charger } from "@/pages/inscription/state";
import { useAuth } from "@/context/AuthContext";
import { usePageTitle } from "@/lib/usePageTitle";
import s from "./Inscription.module.css";

const ETAPES_INTERIMAIRE = [
  {
    titre: "1. Compte",
    texte: "Création de vos identifiants d’accès sécurisés.",
  },
  {
    titre: "2. Identité & Localisation",
    texte: "Coordonnées personnelles et adresse.",
  },
  {
    titre: "3. Métier & Mobilité",
    texte: "Diplômes, RPPS, compétences et rayon km.",
  },
  {
    titre: "4. Disponibilités & RIB",
    texte: "Dates disponibles et présentation du dossier de démonstration.",
  },
];

const ETAPES_ETABLISSEMENT = [
  {
    titre: "Structure de santé",
    texte: "Raison sociale et numéro FINESS officiel.",
  },
  {
    titre: "Référent",
    texte: "Coordonnées du contact habilité (Direction, Cadre, RH).",
  },
  {
    titre: "Validation",
    texte: "Création du compte et accès à votre espace.",
  },
];

type Erreurs = Record<string, string>;
type OrganizationField = "name" | "address" | "postalCode" | "city";
type FinessState = {
  state: "idle" | "loading" | "found" | "missing" | "error";
  data?: FinessLookup;
};
const referenceDate = (value?: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
        new Date(value),
      )
    : "";

export default function Inscription() {
  usePageTitle(
    "Créer mon compte",
    "Rejoignez InfiMatch en tant qu'intérimaire de santé ou en tant qu'établissement.",
  );

  const navigate = useNavigate();
  const { register } = useAuth();
  const [searchParams] = useSearchParams();
  const espace = searchParams.get("espace");
  const location = useLocation();
  const [google, setGoogle] = useState(
    () => searchParams.get("google") === "1" || charger().google,
  );
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [googleVersion, setGoogleVersion] = useState(0);
  const [role, setRole] = useState<Role>(() =>
    espace === "etablissement" || espace === "agence"
      ? "entreprise"
      : "interimaire",
  );

  // Identifiants de connexion (Communs)
  const [email, setEmail] = useState(() => charger().email);
  const [motDePasse, setMotDePasse] = useState(() => charger().motDePasse);
  const [confirmation, setConfirmation] = useState(() => charger().motDePasse);
  const [cgu, setCgu] = useState(false);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [enCours, setEnCours] = useState(false);
  const [compteCree, setCompteCree] = useState(false);

  // Champs Spécifiques Établissement
  const [organizationType, setOrganizationType] = useState<
    "ESTABLISHMENT" | "AGENCY"
  >(() => (espace === "agence" ? "AGENCY" : "ESTABLISHMENT"));
  const [siret, setSiret] = useState("");
  const [nomEtablissement, setNomEtablissement] = useState("");
  const [finess, setFiness] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [villeEtablissement, setVilleEtablissement] = useState("");
  const [referentPrenom, setReferentPrenom] = useState("");
  const [referentNom, setReferentNom] = useState("");
  const [referentFonction, setReferentFonction] = useState("");
  const [referentTelephone, setReferentTelephone] = useState("");

  const interimaire = role === "interimaire";
  const [finessState, setFinessState] = useState<FinessState>({
    state: "idle",
  });
  const [finessVersion, setFinessVersion] = useState(0);
  const finessGeneration = useRef(0);
  const finessController = useRef<AbortController | null>(null);
  const fieldEdits = useRef<Record<OrganizationField, number>>({
    name: 0,
    address: 0,
    postalCode: 0,
    city: 0,
  });
  const autoFilled = useRef<Partial<Record<OrganizationField, string>>>({});
  const organizationSetters = {
    name: setNomEtablissement,
    address: setAdresse,
    postalCode: setCodePostal,
    city: setVilleEtablissement,
  };

  function editOrganizationField(field: OrganizationField, value: string) {
    fieldEdits.current[field]++;
    delete autoFilled.current[field];
    organizationSetters[field](value);
  }

  function clearAutomaticFields() {
    for (const [field, value] of Object.entries(autoFilled.current) as [
      OrganizationField,
      string,
    ][]) {
      organizationSetters[field]((current) =>
        current === value ? "" : current,
      );
    }
    autoFilled.current = {};
  }

  function changeFiness(value: string) {
    const normalized = normalizeFiness(value).slice(0, 9);
    if (normalized === finess) return;
    // Cancel synchronously: a response arriving before React's next effect is stale too.
    finessGeneration.current++;
    finessController.current?.abort();
    clearAutomaticFields();
    setFinessState({ state: "idle" });
    setFiness(normalized);
    setErreurs((current) => ({ ...current, finess: "" }));
  }

  useEffect(() => {
    const generation = ++finessGeneration.current;
    const controller = new AbortController();
    finessController.current = controller;
    if (
      interimaire ||
      organizationType !== "ESTABLISHMENT" ||
      !isCompleteFiness(finess)
    ) {
      setFinessState({ state: "idle" });
      if (interimaire || organizationType !== "ESTABLISHMENT")
        clearAutomaticFields();
      return () => controller.abort();
    }
    setFinessState({ state: "loading" });
    const editsAtStart = { ...fieldEdits.current };
    const timer = window.setTimeout(() => {
      void lookupFiness(finess, controller.signal)
        .then((data) => {
          if (
            controller.signal.aborted ||
            generation !== finessGeneration.current
          )
            return;
          const establishment = data.establishment;
          if (data.status !== "FOUND_IN_SNAPSHOT" || !establishment) {
            setFinessState({ state: "missing", data });
            return;
          }
          const values: Record<OrganizationField, string> = {
            name: establishment.name || "",
            address: establishment.address || "",
            postalCode: establishment.postal_code || "",
            city: establishment.city || "",
          };
          for (const field of Object.keys(values) as OrganizationField[]) {
            if (fieldEdits.current[field] !== editsAtStart[field]) continue;
            const value = values[field];
            organizationSetters[field]((current) => {
              // A manually entered field remains authoritative, including edits made while loading.
              if (
                controller.signal.aborted ||
                generation !== finessGeneration.current ||
                fieldEdits.current[field] !== editsAtStart[field] ||
                current.trim()
              )
                return current;
              if (value) autoFilled.current[field] = value;
              return value;
            });
          }
          setFinessState({ state: "found", data });
        })
        .catch(() => {
          if (
            !controller.signal.aborted &&
            generation === finessGeneration.current
          )
            setFinessState({ state: "error" });
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [finess, interimaire, organizationType, finessVersion]);

  useEffect(() => {
    if (searchParams.get("google") === "1") setGoogle(true);
  }, [searchParams]);

  useEffect(() => {
    if (!google) return;
    const controller = new AbortController();
    setGoogleReady(false);
    setGoogleError("");
    void api<{ email: string; firstName?: string; lastName?: string }>(
      "/auth/google/registration",
      { signal: controller.signal },
    )
      .then((identity) => {
        if (controller.signal.aborted) return;
        const draft = charger();
        setEmail(identity.email);
        setMotDePasse("");
        setConfirmation("");
        setReferentPrenom((value) => value || identity.firstName || "");
        setReferentNom((value) => value || identity.lastName || "");
        enregistrer({
          google: true,
          email: identity.email,
          motDePasse: "",
          prenom: draft.prenom || identity.firstName || "",
          nom: draft.nom || identity.lastName || "",
        });
        setGoogleReady(true);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setGoogleError(
            error instanceof Error
              ? error.message
              : "Impossible de vérifier votre compte Google. Réessayez.",
          );
      });
    return () => controller.abort();
  }, [google, location.key, googleVersion]);

  function choisirEmail() {
    setGoogle(false);
    setGoogleReady(false);
    setGoogleError("");
    enregistrer({ google: false, motDePasse: "" });
    const params = new URLSearchParams(searchParams);
    params.delete("google");
    navigate(`/inscription${params.size ? `?${params.toString()}` : ""}`, {
      replace: true,
    });
  }

  function verifier(): Erreurs {
    const trouvees: Erreurs = {};

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      trouvees.email = "Indiquez une adresse e-mail valide.";
    if (!google && (motDePasse.length < 12 || motDePasse.length > 128))
      trouvees.motDePasse = "Entre 12 et 128 caractères.";
    if (!google && confirmation !== motDePasse)
      trouvees.confirmation = "Les deux mots de passe diffèrent.";

    if (interimaire) {
      // Pour l'infirmier : seules les informations de compte sont requises ici.
      // L'identité civile (nom/prénom/naissance) et la qualification seront renseignées
      // sans redondance dans les étapes suivantes (/inscription/identite, etc.)
    } else {
      if (!cgu)
        trouvees.cgu = "Vous devez accepter les conditions d'utilisation.";
      if (!nomEtablissement.trim())
        trouvees.nomEtablissement = "Indiquez le nom de l'établissement.";
      // Neuf caractères, avec les préfixes corses 2A et 2B acceptés.
      if (organizationType === "ESTABLISHMENT" && !isCompleteFiness(finess)) {
        trouvees.finess = "Indiquez un numéro FINESS valide de 9 caractères.";
      }
      if (organizationType === "AGENCY" && siret && !/^\d{14}$/.test(siret))
        trouvees.siret = "Le SIRET doit contenir 14 chiffres.";
      if (!adresse.trim())
        trouvees.adresse = "Indiquez l'adresse de l'établissement.";
      if (!/^\d{5}$/.test(codePostal.replace(/\s/g, ""))) {
        trouvees.codePostal = "Code postal à 5 chiffres requis.";
      }
      if (!villeEtablissement.trim())
        trouvees.villeEtablissement = "Indiquez la ville.";
      if (!referentPrenom.trim())
        trouvees.referentPrenom = "Indiquez le prénom du référent.";
      if (!referentNom.trim())
        trouvees.referentNom = "Indiquez le nom du référent.";
      if (!referentFonction.trim()) {
        trouvees.referentFonction =
          "Indiquez la fonction (ex: Cadre, Directeur des soins, RH).";
      }
      if (!referentTelephone.trim())
        trouvees.referentTelephone = "Numéro de téléphone direct requis.";
    }

    return trouvees;
  }

  async function soumettre(event: FormEvent) {
    event.preventDefault();
    if (enCours || (google && !googleReady)) return;

    const trouvees = verifier();
    setErreurs(trouvees);
    if (Object.keys(trouvees).length > 0) return;

    setEnCours(true);

    if (interimaire) {
      // Stockage des identifiants et passage à l'étape 2 (Identité) sans doublon
      enregistrer({
        google,
        email,
        motDePasse: google ? "" : motDePasse,
      });
      navigate("/inscription/identite");
    } else {
      // Création directe du compte établissement avec numéro FINESS et référent
      try {
        await register({
          google,
          role: "entreprise",
          organizationType,
          siret: organizationType === "AGENCY" ? siret : undefined,
          email,
          motDePasse,
          prenom: referentPrenom,
          nom: referentNom,
          nomEtablissement,
          finess:
            organizationType === "ESTABLISHMENT"
              ? normalizeFiness(finess)
              : undefined,
          adresse,
          codePostal,
          ville: villeEtablissement,
          referentPrenom,
          referentNom,
          referentFonction,
          referentTelephone,
          cgu,
        });
        navigate("/inscription/confirmation-etablissement");
      } catch (err: unknown) {
        if (
          err instanceof ApiError &&
          err.code === "GOOGLE_REGISTRATION_EXPIRED"
        ) {
          setGoogleReady(false);
          setGoogleError(err.message);
        }
        if (err instanceof AccountCreatedError) setCompteCree(true);
        if (err instanceof Error) {
          setErreurs({ general: err.message });
        } else {
          setErreurs({ general: "Erreur lors de l'inscription." });
        }
      } finally {
        setEnCours(false);
      }
    }
  }

  if (compteCree)
    return (
      <EcranAuth
        promo={<p>Votre compte est enregistré.</p>}
        lien={<Link to="/connexion">Me connecter</Link>}
      >
        <h1>Compte créé</h1>
        <p role="alert">
          Votre compte a été enregistré, mais votre session est indisponible.
          {google
            ? "Reconnectez-vous avec Google"
            : "Connectez-vous avec vos identifiants"}{" "}
          ; inutile de recréer le compte.
        </p>
      </EcranAuth>
    );
  const promo = (
    <>
      <p className={a.claim}>Votre espace commence ici.</p>
      <p className={a.sous}>
        {interimaire
          ? "Créez vos accès pour débuter votre profil de soignant."
          : "Inscription rapide pour votre établissement de santé."}
      </p>

      <ol className={s.etapes}>
        {(interimaire ? ETAPES_INTERIMAIRE : ETAPES_ETABLISSEMENT).map(
          (etape, rang) => (
            <li
              key={etape.titre}
              className={[s.etape, rang === 0 && s.courante]
                .filter(Boolean)
                .join(" ")}
              aria-current={rang === 0 ? "step" : undefined}
            >
              <span className={s.numero} aria-hidden="true">
                {rang + 1}
              </span>
              <span className={s.titre}>{etape.titre}</span>
              <span className={s.texte}>{etape.texte}</span>
            </li>
          ),
        )}
      </ol>
    </>
  );

  return (
    <EcranAuth
      photoMaquette="inscription"
      formulaireLarge
      promo={promo}
      lien={
        <p className={s.deja}>
          <span className={s.dejaTexte}>Déjà inscrit ?</span>{" "}
          <Link to="/connexion">Se connecter</Link>
        </p>
      }
    >
      <h1 className={s.titrePage}>
        Créer mon compte{" "}
        {interimaire
          ? "professionnel de santé"
          : organizationType === "AGENCY"
            ? "agence"
            : "établissement"}
      </h1>

      <div className={s.googleAcces}>
        {google ? (
          <>
            <p className={s.googleTitre}>
              {googleReady
                ? "Votre adresse Google est vérifiée"
                : googleError
                  ? "Reprendre avec Google"
                  : "Vérification de votre inscription Google…"}
            </p>
            {googleReady && (
              <p>
                Complétez votre profil et acceptez les conditions pour créer
                votre compte. Aucun mot de passe InfiMatch à créer.
              </p>
            )}
            {!googleReady && !googleError && (
              <p role="status">Chargement de votre adresse vérifiée…</p>
            )}
            {googleError && (
              <>
                <p role="alert">{googleError}</p>
                <GoogleConnexion mode="signup" />
                <button
                  className={s.googleLien}
                  type="button"
                  onClick={() => setGoogleVersion((v) => v + 1)}
                >
                  Vérifier à nouveau
                </button>
              </>
            )}
            <button
              className={s.googleLien}
              type="button"
              onClick={choisirEmail}
            >
              Utiliser plutôt un e-mail et un mot de passe
            </button>
          </>
        ) : (
          <GoogleConnexion mode="signup" />
        )}
      </div>

      <MatchingReminder enterprise={role !== "interimaire"} />
      <form className={s.form} onSubmit={soumettre} noValidate>
        <ChoixRole
          legende="Je crée un compte en tant que"
          name="role"
          value={role}
          onChange={(nouveauRole) => {
            setRole(nouveauRole);
            setErreurs({});
          }}
        />

        {erreurs.general && (
          <p className={s.erreur} role="alert">
            {erreurs.general}
          </p>
        )}

        {interimaire ? (
          /* ======================== IDENTIFIANTS INFIRMIER (SANS REDONDANCE) ======================== */
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
              <strong>Parcours en étapes :</strong> Vos coordonnées civiles
              (nom, prénom), diplômes et disponibilités seront renseignés aux
              étapes suivantes.
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
        ) : (
          /* ==================== FORMULAIRE ÉTABLISSEMENT DÉDIÉ ==================== */
          <>
            <SelectField
              label="Type d’organisation"
              value={organizationType}
              onChange={(e) =>
                setOrganizationType(
                  e.target.value as "AGENCY" | "ESTABLISHMENT",
                )
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
                        {Number.isFinite(
                          finessState.data.establishment.latitude,
                        ) &&
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
                      répertoire disponible. Vérifiez le numéro ou renseignez
                      les coordonnées ci-dessous.
                    </p>
                  )}
                  {finessState.state === "error" && (
                    <div className={s.finessNotice}>
                      <p>
                        Le répertoire FINESS est momentanément indisponible.
                        Vous pouvez renseigner les coordonnées manuellement.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFinessVersion((version) => version + 1)
                        }
                      >
                        Réessayer la recherche FINESS
                      </Button>
                    </div>
                  )}
                </div>
                <p className={s.finessHelp}>
                  Cette recherche identifie la structure et ne donne pas accès à
                  un compte existant. Le référent est à renseigner séparément.
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
                onChange={(e) =>
                  editOrganizationField("postalCode", e.target.value)
                }
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

            <p className={s.aide}>Les informations nécessaires au service demandé servent à créer le compte de votre organisation et à faciliter la mise en relation. Ne transmettez aucune donnée permettant d’identifier un patient ni aucune donnée de santé concernant un patient.</p>

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
        )}
      </form>

      <p className={s.obligatoires}>* Champs obligatoires visibles</p>
    </EcranAuth>
  );
}

