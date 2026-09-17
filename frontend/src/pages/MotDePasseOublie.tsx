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
  const [email,setEmail]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");const pending=useRef(false);
  async function submit(event:FormEvent){event.preventDefault();if(pending.current)return;setError("");setMessage("");if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setError("Saisissez une adresse e-mail valide.");return;}pending.current=true;setBusy(true);try{await forgotPassword(email.trim());setMessage("Votre demande a été prise en compte. Si un compte correspond, un administrateur pourra examiner la demande et vérifier votre identité avant de vous transmettre un lien. Aucun e-mail automatique n’est envoyé.");}catch{setError("La demande n’a pas été confirmée. Réessayez dans un instant.");}finally{pending.current=false;setBusy(false);}}
  return <EcranAuth compactMobile promo={<p>Retrouvez votre espace InfiMatch.</p>} lien={<Link to="/">Retour à l’accueil</Link>}>
    <div className={s.intro}><h1>Retrouver mon accès</h1><p>Un administrateur examine votre demande et vérifie votre identité avant de transmettre un lien personnel. Aucun e-mail de réinitialisation n’est envoyé automatiquement.</p></div>
    <form className={s.form} onSubmit={submit} noValidate>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<TextField label="Adresse e-mail du compte" value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" required disabled={busy}/><Button type="submit" loading={busy}>Demander de l’aide pour mon accès</Button></form><p className={s.bascule}><ButtonLink variant="outline" to="/connexion">Revenir à la connexion</ButtonLink></p>
  </EcranAuth>;
}
