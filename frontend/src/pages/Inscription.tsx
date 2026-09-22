import { validateAccount } from "./inscription/accountValidation";
import type { AccountErrors, FinessState, OrganizationField } from "./inscription/accountTypes";
import { OrganizationAccountFields } from "./inscription/OrganizationAccountFields";
import { ReferentFields } from "./inscription/ReferentFields";
import { OrganizationFields } from "./inscription/OrganizationFields";
import { CandidateAccountFields } from "./inscription/CandidateAccountFields";
import { MatchingReminder } from "@/components/MatchingReminder";
import { api, ApiError } from "@/services/api";
import { GoogleConnexion } from "@/components/GoogleConnexion";
import { AccountCreatedError } from "@/services/auth";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  isCompleteFiness,
  lookupFiness,
  normalizeFiness,
} from "@/services/finess";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router";
import { EcranAuth, authStyles as a } from "@/layouts/EcranAuth";
import { ChoixRole, type Role } from "@/ui/ChoixRole";
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
  const [erreurs, setErreurs] = useState<AccountErrors>({});
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

  async function soumettre(event: FormEvent) {
    event.preventDefault();
    if (enCours || (google && !googleReady)) return;

    const trouvees = validateAccount({
      email, motDePasse, confirmation, nomEtablissement, finess, siret, adresse, codePostal, villeEtablissement, referentPrenom, referentNom, referentFonction, referentTelephone,
      google, interimaire, cgu, organizationType,
    });
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
            <CandidateAccountFields
              email={email}
              motDePasse={motDePasse}
              confirmation={confirmation}
              google={google}
              googleReady={googleReady}
              erreurs={erreurs}
              enCours={enCours}
              setEmail={setEmail}
              setMotDePasse={setMotDePasse}
              setConfirmation={setConfirmation}
            />

          </>
        ) : (
          /* ==================== FORMULAIRE ÉTABLISSEMENT DÉDIÉ ==================== */
          <>
            <OrganizationFields
              organizationType={organizationType}
              setOrganizationType={setOrganizationType}
              finess={finess}
              finessState={finessState}
              changeFiness={changeFiness}
              setFinessVersion={setFinessVersion}
              siret={siret}
              setSiret={setSiret}
              nomEtablissement={nomEtablissement}
              adresse={adresse}
              codePostal={codePostal}
              villeEtablissement={villeEtablissement}
              editOrganizationField={editOrganizationField}
              erreurs={erreurs}
            />

            <ReferentFields
              referentPrenom={referentPrenom}
              setReferentPrenom={setReferentPrenom}
              referentNom={referentNom}
              setReferentNom={setReferentNom}
              referentFonction={referentFonction}
              setReferentFonction={setReferentFonction}
              referentTelephone={referentTelephone}
              setReferentTelephone={setReferentTelephone}
              erreurs={erreurs}
            />

            <OrganizationAccountFields
              email={email}
              motDePasse={motDePasse}
              confirmation={confirmation}
              google={google}
              googleReady={googleReady}
              erreurs={erreurs}
              enCours={enCours}
              setEmail={setEmail}
              setMotDePasse={setMotDePasse}
              setConfirmation={setConfirmation}
              cgu={cgu}
              setCgu={setCgu}
              organizationType={organizationType}
            />

          </>
        )}
      </form>

      <p className={s.obligatoires}>* Champs obligatoires visibles</p>
    </EcranAuth>
  );
}

