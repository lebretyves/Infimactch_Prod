import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useNavigate} from 'react-router';
import {QRCodeSVG} from 'qrcode.react';
import {Button} from '../ui/Button';
import {Logo} from '../ui/Logo';
import {api,AdminError,clearSession} from './api';
import type {User} from './App';
type Challenge={status:string;secret?:string;otpauthUri?:string;recoveryCodes?:string[]};
export function AdminLogin({ready}:{ready:(u:User)=>void}){
 const navigate=useNavigate();
 function finish(user:User){if(window.location.hash==='#/activation')navigate('/overview',{replace:true});ready(user);}
 const [mode,setMode]=useState<'login'|'invitation'>(window.location.hash==='#/activation'?'invitation':'login');
 const [email,setEmail]=useState(''),[invitation,setInvitation]=useState('');
 const [passwordSetupRequired,setPasswordSetupRequired]=useState<boolean|null>(null);
 const [step,setStep]=useState<Challenge|null>(null),[recovery,setRecovery]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const title=useRef<HTMLHeadingElement>(null);
 const invitationCheck=mode==='invitation'&&passwordSetupRequired===null;
 const activate=mode==='invitation'&&!invitationCheck;
 const formKey=step?.secret||step?.status||`${mode}-${passwordSetupRequired}`;
 useEffect(()=>{title.current?.focus();},[formKey]);
 function chooseMode(next:'login'|'invitation') {setMode(next);setInvitation('');setPasswordSetupRequired(null);setError('');}
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=new FormData(e.currentTarget);setBusy(true);setError('');
  try{
   if(step?.recoveryCodes){finish(await api<User>('/me'));return;}
   if(!step&&invitationCheck){
    const checked=await api<{passwordSetupRequired:boolean}>('/invitation/check',{email:email.trim(),invitation:invitation.trim()});
    if(!checked.passwordSetupRequired){setError('Cet accès est déjà configuré. Utilisez « J’ai déjà un accès » pour vous connecter.');return;}
    setEmail(email.trim());setInvitation(invitation.trim());setPasswordSetupRequired(true);return;
   }
   if(activate&&!step&&form.get('password')!==form.get('passwordConfirmation')){setError('Les deux mots de passe doivent être identiques.');return;}
   const response=await api<Challenge>(step?(recovery?'/mfa/recover':'/mfa'):(activate?'/activate':'/login'),step?{code:form.get('code')}:{email:email.trim(),password:form.get('password'),...(mode==='invitation'?{invitation}: {})});
   form.delete('password');form.delete('passwordConfirmation');form.delete('code');
   if(response.status==='AUTHENTICATED'&&!response.recoveryCodes){finish(await api<User>('/me'));return;}
   setInvitation('');setStep(response);setRecovery(false);
  }catch(e){setError(e instanceof AdminError?e.message:'Connexion impossible. Vérifiez votre connexion et réessayez.');}finally{setBusy(false);}
 }
 async function back(){setBusy(true);try{await api('/logout',{});clearSession();setStep(null);setRecovery(false);chooseMode('login');}catch{setError('Impossible de fermer la vérification. Réessayez.');}finally{setBusy(false);}}
 return <main className="admin-auth"><div className="admin-auth-brand"><Logo withWordmark size={48}/><span>ADMINISTRATION</span><h1>Veiller au bon fonctionnement, à chaque étape.</h1><p>Un espace réservé aux personnes habilitées pour accompagner les clients et suivre les services InfiMatch.</p><div className="admin-auth-note">Mot de passe et double authentification obligatoires</div></div><section className="admin-auth-form"><p className="admin-eyebrow">Accès à la plateforme</p><h2 ref={title} tabIndex={-1}>{step?.recoveryCodes?'Conserver vos codes de secours':step?.secret?'Configurer la double authentification':step?'Vérifier votre identité':mode==='invitation'?(invitationCheck?'Vérifier votre invitation':activate?'Créer votre mot de passe':'Utiliser votre mot de passe'):'Connexion sécurisée'}</h2>
 {!step&&<div className="admin-auth-choices" role="group" aria-label="Choisir votre parcours"><button type="button" aria-pressed={mode==='login'} disabled={busy} onClick={()=>chooseMode('login')}>J’ai déjà un accès</button><button type="button" aria-pressed={mode==='invitation'} disabled={busy} onClick={()=>chooseMode('invitation')}>J’ai reçu une invitation</button></div>}
 <form key={formKey} onSubmit={submit} aria-busy={busy}>
 <fieldset disabled={busy} className="admin-auth-fields">
 {!step?<>{mode==='invitation'&&<p className="admin-auth-progress">{invitationCheck?'Étape 1 sur 3 · Invitation':'Étape 2 sur 3 · Mot de passe'}</p>}
 {mode==='login'||invitationCheck?<label>Adresse e-mail<input name="email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>:<p className="admin-auth-verified">Invitation vérifiée pour <strong>{email}</strong></p>}
 {invitationCheck?<><p>Copiez le code reçu avec votre invitation. Nous vous guiderons pour la suite.</p><label>Code d’invitation administrateur<input name="invitation" type="password" autoComplete="off" value={invitation} onChange={e=>setInvitation(e.target.value)} minLength={32} maxLength={128} required/></label></>:<>
 {mode==='invitation'&&<p>{activate?'Créez le mot de passe de votre accès administrateur. Il ne remplace pas celui de votre éventuel compte métier.':'Votre accès administrateur est déjà configuré. Utilisez son mot de passe pour continuer.'}</p>}
 <label>{activate?'Nouveau mot de passe (12 caractères minimum)':'Mot de passe'}<input name="password" type="password" autoComplete={activate?'new-password':'current-password'} minLength={12} maxLength={128} required/></label>
 {activate&&<label>Confirmer le nouveau mot de passe<input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label>}
 </>}</>:step.recoveryCodes?<><p>Ces huit codes sont affichés une seule fois. Conservez-les dans votre coffre personnel ou sur papier, séparément du téléphone. Chaque code permet une seule récupération et impose de configurer une nouvelle application.</p><label>Codes de secours<textarea readOnly value={step.recoveryCodes.join('\n')} rows={8} autoComplete="off" spellCheck={false}/></label><label><input type="checkbox" required/>J’ai conservé mes codes dans un endroit sûr.</label></>:<>{step.secret?<>{mode==='invitation'&&<p className="admin-auth-progress">Étape 3 sur 3 · Double authentification</p>}<ol className="admin-mfa-steps"><li>Sur votre téléphone, ouvrez Google Authenticator ou Microsoft Authenticator.</li><li>Appuyez sur <strong>+</strong>, puis <strong>Scanner un QR code</strong>.</li><li>Scannez le carré ci-dessous, puis saisissez les <strong>6 chiffres</strong> affichés sur votre téléphone.</li></ol>{step.otpauthUri&&<div className="admin-mfa-qr"><QRCodeSVG value={step.otpauthUri} size={240} marginSize={4} level="M" role="img" aria-label="QR code à scanner dans votre application d’authentification"/></div>}<details><summary>Je ne peux pas scanner le QR code</summary><p>Dans votre application, choisissez la saisie manuelle. Nom : InfiMatch Admin. Type : basé sur le temps.</p><label>Clé de configuration confidentielle<input readOnly value={step.secret} autoComplete="off" spellCheck={false}/></label></details><p>Cette étape expire après cinq minutes. Si elle expire, cliquez sur « Revenir à la connexion » et choisissez {mode==='invitation'&&!activate?'« J’ai reçu une invitation »':'« J’ai déjà un accès »'} pour reprendre avec votre mot de passe. Gardez le QR code et la clé confidentiels.</p></>:<p>{recovery?'Saisissez un code de secours conservé lors de l’activation. Vous devrez ensuite configurer une nouvelle application.':'Saisissez le code à six chiffres de votre application d’authentification. Un code déjà utilisé sera refusé ; attendez le suivant.'}</p>}<label>{recovery?'Code de secours':'Code de sécurité'}<input key={String(recovery)} name="code" type={recovery?'password':'text'} inputMode={recovery?'text':'numeric'} autoComplete={recovery?'off':'one-time-code'} pattern={recovery?'[a-f0-9]{32}':'[0-9]{6}'} minLength={recovery?32:6} maxLength={recovery?32:6} required autoFocus/></label></>}
 {error&&<p role="alert" className="admin-message admin-error">{error}</p>}<Button type="submit" loading={busy} block>{step?.recoveryCodes?'Accéder à l’administration':step?'Vérifier':invitationCheck?'Vérifier mon invitation':mode==='invitation'?'Créer mon mot de passe':'Se connecter'}</Button>
 {step&&!step.secret&&!step.recoveryCodes&&<Button type="button" variant="outline" disabled={busy} onClick={()=>{setRecovery(!recovery);setError('');}}>{recovery?'Utiliser mon application':'Utiliser un code de secours'}</Button>}
 {step?<Button type="button" variant="outline" disabled={busy} onClick={back}>Revenir à la connexion</Button>:mode==='invitation'&&!invitationCheck&&<button className="admin-auth-back" type="button" disabled={busy} onClick={()=>{setPasswordSetupRequired(null);setError('');}}>Corriger l’invitation</button>}
 </fieldset> </form><small>Aucun accès aux données clients avant vérification des deux facteurs.</small></section></main>;
}
