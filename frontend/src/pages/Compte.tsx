import { GoogleConnexion } from "@/components/GoogleConnexion";
import { useId, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRemote } from '@/lib/useRemote';
import { usePageTitle } from '@/lib/usePageTitle';
import { api } from '@/services/api';
import { Button } from '@/ui/Button';
import { PasswordField } from '@/ui/Field';
import { date } from '@/services/market';
import s from './MarketPages.module.css';
type Closure={id:string;status:string;requested_at:string;approved_at:string|null;completed_at:string|null;decision_reason:string|null;last_error:string|null};
const labels:Record<string,string>={REQUESTED:'En attente d’examen',APPROVED:'Approuvée — exécution à venir',PROCESSING:'Traitement en cours',COMPLETED:'Clôture effectuée',CANCELLED:'Demande annulée',REJECTED:'Demande refusée'};
export default function Compte() {
  usePageTitle('Mon compte');const {user}=useAuth();
  const remote=useRemote(signal=>api<{request:Closure|null;googleLinked?:boolean}>('/me/closure-request',{signal}),user?.id||'');
  const [password,setPassword]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');const pending=useRef(false);
  const passwordInput=useRef<HTMLInputElement>(null), confirmationInput=useRef<HTMLInputElement>(null);
  const [submitted,setSubmitted]=useState(false);
  const confirmationErrorId=useId();
  const request=remote.data?.request;
  const googleLinked=remote.data?.googleLinked===true;
  const active=!!request&&['REQUESTED','APPROVED','PROCESSING','COMPLETED'].includes(request.status);
  async function submit(event:FormEvent) {
    event.preventDefault();if(pending.current)return;setError('');setMessage('');
    setSubmitted(true);
    if(googleLinked)return;
    if(!password||!confirmed){(!password?passwordInput:confirmationInput).current?.focus();return;}
    pending.current=true;setBusy(true);
    try{await api('/me/closure-request',{method:'POST',body:{password}});setPassword('');setConfirmed(false);setSubmitted(false);setMessage('Votre demande a été enregistrée pour examen. Votre compte n’est pas encore clôturé.');remote.reload();}
    catch(cause){setError(cause instanceof Error?cause.message:'La demande n’a pas été confirmée. Réessayez.');}
    finally{pending.current=false;setBusy(false);}
  }
  async function cancel(){if(pending.current)return;pending.current=true;setBusy(true);setError('');setMessage('');try{await api('/me/closure-request',{method:'DELETE'});setMessage('Votre demande de clôture a été annulée.');remote.reload();}catch(cause){setError(cause instanceof Error?cause.message:'L’annulation n’a pas été confirmée.');}finally{pending.current=false;setBusy(false);}}
  return <div className={`${s.page} ${s.focusedPage}`}><header className={s.header}><div><h1>Mon compte</h1><p>Consultez et gérez votre demande de clôture.</p></div></header>
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    <section className={s.card}><h2>Clôturer mon compte</h2><p>La demande est examinée par un administrateur. Des candidatures en cours, des missions ouvertes ou affectées, ou votre rôle de dernier responsable d’une organisation peuvent bloquer la clôture.</p><p>Après exécution, l’accès au compte est retiré et les données de profil sont anonymisées. L’historique métier nécessaire peut être conservé : il ne s’agit pas d’un effacement immédiat de toutes les données.</p>
      {remote.loading?<p role="status">Chargement de votre demande…</p>:remote.error?<div role="alert"><p>{remote.error}</p><Button onClick={remote.reload}>Réessayer</Button></div>:<>
        {request&&<section style={{marginBlock:20}} aria-label="Suivi de ma demande"><h3>{labels[request.status]||'État à vérifier'}</h3><p>Demandée le {date(request.requested_at)}</p>{request.approved_at&&<p>Approuvée le {date(request.approved_at)}</p>}{request.completed_at&&<p>Traitée le {date(request.completed_at)}</p>}{request.decision_reason&&<p>Décision de l’administrateur : {request.decision_reason}</p>}{request.last_error&&<p role="status">Le traitement n’est pas terminé. Un administrateur doit vérifier la demande et reprendre les opérations restantes.</p>}{['REQUESTED','APPROVED'].includes(request.status)&&<Button variant="outline" disabled={busy} onClick={cancel}>Annuler ma demande de clôture</Button>}{request.status==='PROCESSING'&&<p>La demande est en cours de traitement et ne peut plus être annulée ici.</p>}</section>}
        {!active&&<form onSubmit={submit} noValidate style={{display:'grid',gap:16,marginTop:20}}>{!googleLinked&&<PasswordField ref={passwordInput} error={submitted&&!password?"Saisissez votre mot de passe actuel.":undefined} label="Mot de passe actuel" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required disabled={busy}/>}<label style={{display:'flex',alignItems:'flex-start',gap:10}}><input ref={confirmationInput} aria-invalid={submitted&&!confirmed||undefined} aria-describedby={submitted&&!confirmed?confirmationErrorId:undefined} type="checkbox" style={{width:20,height:20,flexShrink:0,marginTop:3}} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/>Je demande la clôture de mon compte après examen et j’ai compris que mon accès sera retiré, que mon profil sera anonymisé et qu’un historique métier pourra être conservé.</label>{submitted&&!confirmed&&<p id={confirmationErrorId} role="alert">Confirmez avoir compris les conséquences de la clôture avant de poursuivre.</p>}{googleLinked ? confirmed ? <GoogleConnexion mode="closure" onClosureComplete={()=>{setConfirmed(false);setMessage('Votre demande a été enregistrée pour examen. Votre compte n’est pas encore clôturé.');remote.reload();}}/> : <p>Cochez la confirmation ci-dessus, puis confirmez votre identité avec Google pour envoyer la demande.</p> : <Button type="submit" variant="danger" loading={busy}>Confirmer ma demande de clôture</Button>}</form>}
      </>}
    </section>
  </div>;
}
