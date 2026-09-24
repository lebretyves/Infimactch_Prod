import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { EcranAuth } from "@/layouts/EcranAuth";
import { Button, ButtonLink } from "@/ui/Button";
import { TextField } from "@/ui/Field";
import { forgotPassword } from "@/services/auth";
import { usePageTitle } from "@/lib/usePageTitle";
import s from "./MotDePasseOublie.module.css";
export default function MotDePasseOublie() {
  usePageTitle("Retrouver mon accès");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef(false), emailInput = useRef<HTMLInputElement>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    setError(""); setEmailError(""); setMessage("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Saisissez une adresse e-mail valide."); emailInput.current?.focus(); return;
    }
    pending.current = true; setBusy(true);
    try {
      const response = await forgotPassword(email.trim());
      setMessage(response.message);
    } catch { setError("La demande n’a pas été confirmée. Réessayez dans un instant."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <EcranAuth photoMaquette="connexion" promo={<p>Retrouvez votre espace InfiMatch.</p>} lien={<Link to="/">Retour à l’accueil</Link>}>
    <div className={s.intro}><h1>Retrouver mon accès</h1><p>Indiquez l’adresse e-mail de votre compte pour demander un lien personnel de réinitialisation. Le lien est utilisable une seule fois et valable 30 minutes.</p></div>
    <form className={s.form} onSubmit={submit} noValidate aria-busy={busy}>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <TextField ref={emailInput} label="Adresse e-mail du compte" value={email} error={emailError} onChange={e => { setEmail(e.target.value); setEmailError(""); }} type="email" autoComplete="email" maxLength={254} required disabled={busy}/>
      <Button type="submit" loading={busy}>Recevoir un lien de réinitialisation</Button>
    </form>
    <p className={s.bascule}><ButtonLink variant="outline" to="/connexion">Revenir à la connexion</ButtonLink></p>
  </EcranAuth>;
}
