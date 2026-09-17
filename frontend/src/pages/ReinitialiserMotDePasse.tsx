import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { EcranAuth } from '@/layouts/EcranAuth';
import { Button, ButtonLink } from '@/ui/Button';
import { PasswordField } from '@/ui/Field';
import { api } from '@/services/api';
import { usePageTitle } from '@/lib/usePageTitle';
import s from './MotDePasseOublie.module.css';
export default function ReinitialiserMotDePasse() {
  usePageTitle('Choisir un nouveau mot de passe');
  const location=useLocation(), navigate=useNavigate();
  const [token,setToken]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
  const pending=useRef(false);
  useLayoutEffect(()=>{
    if(!location.hash) return;
    const value=new URLSearchParams(location.hash.slice(1)).get('token');
    if(value && value.length<=512) setToken(value);
    // Remove the secret from browser history and router location immediately.
    window.history.replaceState(window.history.state,'',location.pathname);
    void navigate(location.pathname,{replace:true});
  },[location.hash,location.pathname,navigate]);
  async function submit(event:FormEvent) {
    event.preventDefault(); if(pending.current) return; setError('');
    if(password.length<12||password.length>128) {setError('Choisissez un mot de passe de 12 à 128 caractères.');return;}
    if(password!==confirmation) {setError('Les deux mots de passe doivent être identiques.');return;}
    if(!token) {setError('Le lien est absent ou invalide. Demandez un nouveau lien.');return;}
    pending.current=true;setBusy(true);
    try {await api('/auth/recovery/complete',{method:'POST',body:{token,password}});setDone(true);setToken('');setPassword('');setConfirmation('');}
    catch {setError('La réinitialisation n’a pas été confirmée. Le lien peut être expiré ou déjà utilisé, ou le service indisponible. Réessayez ou demandez un nouveau lien.');}
    finally {pending.current=false;setBusy(false);}
  }
  return <EcranAuth compactMobile promo={<p>Retrouvez votre espace InfiMatch.</p>} lien={<Link to="/connexion">Retour à la connexion</Link>}>
    <div className={s.intro}><h1>Choisir un nouveau mot de passe</h1><p>Le lien transmis par l’administrateur est personnel, utilisable une seule fois et valable 30 minutes.</p></div>
    {done?<div role="status"><p>Votre mot de passe a été modifié. Connectez-vous avec votre nouveau mot de passe.</p><ButtonLink to="/connexion">Se connecter</ButtonLink></div>:!token?<p role="alert">Aucun lien de réinitialisation valide n’est présent. <Link to="/mot-de-passe-oublie">Demander de l’aide pour retrouver mon accès</Link>.</p>:<form className={s.form} onSubmit={submit} noValidate>
      {error&&<p role="alert">{error}</p>}
      <PasswordField hint="12 à 128 caractères." label="Nouveau mot de passe" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy}/>
      <PasswordField label="Confirmer le nouveau mot de passe" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy}/>
      <Button type="submit" loading={busy}>Modifier mon mot de passe</Button><Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link>
    </form>}
  </EcranAuth>;
}
