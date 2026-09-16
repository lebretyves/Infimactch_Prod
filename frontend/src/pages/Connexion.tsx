import { GoogleConnexion } from "@/components/GoogleConnexion";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { EcranAuth, authStyles as a } from "@/layouts/EcranAuth";
import { Button } from "@/ui/Button";
import { PasswordField, TextField } from "@/ui/Field";
import { Icon } from "@/ui/Icon";
import { useAuth } from "@/context/AuthContext";
import { usePageTitle } from "@/lib/usePageTitle";
import s from "./Connexion.module.css";

export default function Connexion() {
  usePageTitle(
    "Connexion",
    "Connectez-vous à votre espace InfiMatch, intérimaire ou entreprise.",
  );

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [expired] = useState(() => { try { return sessionStorage.getItem("infimatch:expired") === "1"; } catch { return false; } });
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function soumettre(event: FormEvent) {
    event.preventDefault();
    if (enCours) return;

    if (!email.includes("@") || motDePasse.length < 12) {
      setErreur(
        "Identifiants incorrects. Vérifiez votre adresse e-mail et votre mot de passe.",
      );
      return;
    }

    setErreur("");
    setEnCours(true);

    try {
      await login({ email, motDePasse, role: "interimaire" });
      try { sessionStorage.removeItem("infimatch:expired"); } catch {}
      const next = location.state?.from;
      navigate(
        typeof next === "string" &&
          next.startsWith("/") &&
          !next.startsWith("//")
          ? next
          : "/accueil",
        { replace: true },
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErreur(err.message);
      } else {
        setErreur("Identifiants incorrects ou service indisponible.");
      }
    } finally {
      setEnCours(false);
    }
  }

  const promo = (
    <>
      <p className={a.claim}>
        Le bon renfort.
        <br />
        Au bon moment.
      </p>
      <p className={a.sous}>Les missions de santé, simplement.</p>
    </>
  );

  return (
    <EcranAuth
      photoMaquette="connexion"
      promo={promo}
      lien={
        <Link to="/" className={s.retour}>
          <Icon name="arrow-left" size={20} />
          Retour à l'accueil
        </Link>
      }
    >
      <div className={s.intro}>
        <h1>Bienvenue sur InfiMatch</h1>
        <p>Connectez-vous à votre espace.</p>
      </div>

      {expired && <p role="status">Votre session a expiré après une période d’inactivité. Reconnectez-vous pour continuer.</p>}
      <form className={s.form} onSubmit={soumettre} noValidate>
        <p>
          Votre compte ouvre automatiquement votre espace professionnel ou
          organisation.
        </p>

        {erreur && (
          <p className={s.alerte} role="alert">
            {erreur}
          </p>
        )}

        <TextField
          label="Adresse e-mail"
          icon="mail"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="vous@exemple.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={enCours}
        />

        <PasswordField
          label="Mot de passe"
          name="password"
          autoComplete="current-password"
          placeholder="Votre mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          disabled={enCours}
        />

        <Button
          type="submit"
          block
          size="lg"
          loading={enCours}
          disabled={enCours}
        >
          Se connecter
        </Button>
      </form>
      <GoogleConnexion password={motDePasse} />

      <p className={s.bascule}>
        Pas encore de compte ? <Link to="/inscription">Créer mon compte</Link>
      </p>

      <hr className={s.filet} />

      <p className={s.legal}>
        <Link to="/mentions-legales#confidentialite">Confidentialité</Link>
        <span aria-hidden="true">|</span>
        <Link to="/mentions-legales#conditions">Conditions d'utilisation</Link>
      </p>
    </EcranAuth>
  );
}
