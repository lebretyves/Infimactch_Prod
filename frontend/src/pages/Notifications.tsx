import { useRef, useState } from "react";
import { Link } from "react-router";
import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import { organizations } from "@/services/organizations";
import { useAuth } from "@/context/AuthContext";
import { usePageTitle } from "@/lib/usePageTitle";
import { Button } from "@/ui/Button";
import { TextField } from "@/ui/Field";
import s from "./MarketPages.module.css";
import { notificationHref } from "@/lib/notificationHref";
import buttonStyles from "@/ui/Button.module.css";

type Destination={id:string;user_id:string|null;organization_id:string|null;enabled:boolean;events:string[];channel_name:string|null;target_id:string};
type Settings={configured:boolean;link:{discord_user_id:string}|null;destinations:Destination[];catalog:Record<string,string>;organizationKinds:string[];preferences:{kind:string;discord:boolean}[]};
type Notice={id:string;kind:string;message:string;href:string;read_at:string|null;created_at:string};
type Delivery={id:string;kind:string;status:string;created_at:string};
const base="/me/notifications-settings";
const discordInvite=import.meta.env.VITE_DISCORD_INVITE_URL || "https://discord.gg/Ed73jG3pRd";
const deliveryLabels:Record<string,string>={PENDING:"En attente",SENDING:"Envoi en cours",SENT:"Envoyé",FAILED:"Échec — notification disponible ici",CANCELLED:"Envoi annulé : événement ou préférences modifiés",UNCERTAIN:"Réception non confirmée — notification disponible ici"};
function DestinationEditor({destination,org,catalog,save}:{destination?:Destination;org?:string;catalog:Record<string,string>;save:(org:string|undefined,body:unknown)=>Promise<void>}) {
  const [enabled,setEnabled]=useState(destination?.enabled??false),[events,setEvents]=useState(destination?.events??Object.keys(catalog)),[channelId,setChannelId]=useState(destination?.target_id??""),[busy,setBusy]=useState(false);
  return <form onSubmit={e=>{e.preventDefault();setBusy(true);void save(org,{enabled,events,...(org&&enabled?{channelId}:{})}).finally(()=>setBusy(false));}}>
    <label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Recevoir les notifications Discord</label>
    {org&&<><TextField label="Identifiant du salon privé" value={channelId} onChange={e=>setChannelId(e.target.value)} required={enabled} pattern="[0-9]{17,20}"/><p>Réservez un salon à cette organisation, masquez-le à @everyone et donnez au bot accès au salon. Vous devez pouvoir gérer le serveur.</p></>}
    <fieldset disabled={!enabled||busy}><legend>Événements à recevoir</legend>{Object.entries(catalog).map(([kind,label])=><label key={kind} style={{display:"block",marginBlock:8}}><input type="checkbox" checked={events.includes(kind)} onChange={e=>setEvents(v=>e.target.checked?[...v,kind]:v.filter(k=>k!==kind))}/> {label}</label>)}</fieldset>
    <Button type="submit" disabled={busy}>{busy?"Enregistrement…":"Enregistrer les préférences"}</Button>
  </form>;
}
export default function Notifications() {
  usePageTitle("Notifications");
  const {user}=useAuth();
  const [offset,setOffset]=useState(0),[discordId,setDiscordId]=useState(""),[code,setCode]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [discordIdError,setDiscordIdError]=useState("");
  const [challengeError,setChallengeError]=useState(""),[challengeMessage,setChallengeMessage]=useState(""),[sendingCode,setSendingCode]=useState(false);
  const challengePending=useRef(false);
  const settings=useRemote(signal=>api<Settings>(base,{signal}),user?.id??"anonymous");
  const notices=useRemote(signal=>api<Notice[]>("/me/notifications?limit=20&offset="+offset,{signal}),"notices:"+offset);
  const orgs=useRemote(async signal=>user?.role==="interimaire"?null:organizations(signal),user?.id??"anonymous");
  const deliveries=useRemote(signal=>api<Delivery[]>(base+"/deliveries",{signal}),user?.id??"anonymous");
  async function action(fn:()=>Promise<unknown>,success:string) {setBusy(true);setError("");setMessage("");try{await fn();setMessage(success);settings.reload();notices.reload();deliveries.reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function requestDiscordCode(discordUserId:string) {
    if(challengePending.current) return;
    challengePending.current=true;setSendingCode(true);setBusy(true);setChallengeError("");setChallengeMessage("");
    try {
      await api(base+"/discord/challenge",{method:"POST",body:{discordUserId}});
      setChallengeMessage("Code envoyé en message privé Discord. Il expire dans 10 minutes. Saisissez-le ci-dessous pour confirmer votre compte.");
    } catch(cause) {
      setChallengeError(cause instanceof Error ? cause.message : "L’envoi du code n’est pas confirmé. Vérifiez vos messages privés avant de réessayer.");
    } finally {challengePending.current=false;setSendingCode(false);setBusy(false);}
  }
  const data=settings.data;
  return <div className={`${s.page} ${s.focusedPage}`}>
    <header className={s.header}><div><h1>Notifications</h1><p>Retrouvez les informations de vos missions et de votre compte. Les notifications restent disponibles ici, même si Discord est désactivé.</p></div></header>
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    {user?.role === "interimaire" && <nav className={s.sectionNav} aria-label="Sections des notifications"><a href="#notice-list">Votre activité</a><a href="#discord-settings">Réglages Discord</a></nav>}
    <section className={s.card} aria-labelledby="notice-list"><h2 id="notice-list">Votre activité</h2>
      {notices.loading?<p role="status">Chargement…</p>:notices.error?<p role="alert">{notices.error} <Button onClick={notices.reload}>Réessayer</Button></p>:<>
      {notices.data?.length?<ul className={s.noticeList}>{notices.data.map(n=><li className={s.noticeItem} key={n.id} style={user?.role === "interimaire" ? undefined : {paddingBlock:14}}><strong>{data?.catalog[n.kind]||"Notification"}{!n.read_at?" — Non lue":""}</strong><p>{n.message}</p><time dateTime={n.created_at}>{new Date(n.created_at).toLocaleString("fr-FR")}</time><div className={s.actions}><Link to={notificationHref(n.href,n.id)}>Consulter</Link></div></li>)}</ul>:<p>Aucune notification pour cette page.</p>}
      <div className={s.actions}><Button variant="outline" disabled={offset===0} onClick={()=>setOffset(v=>Math.max(0,v-20))}>Précédent</Button><Button variant="outline" disabled={(notices.data?.length??0)<20} onClick={()=>setOffset(v=>v+20)}>Suivant</Button></div></>}
    </section>
    <section className={s.card} aria-labelledby="discord-settings"><h2 id="discord-settings">Notifications Discord</h2>
      <p>Besoin d’aide pour trouver votre identifiant ? <a href="/aide/discord/retrouver-identifiant-discord.pdf" target="_blank" rel="noopener noreferrer">Ouvrir le guide illustré (PDF, 2 pages)</a> · <a href="/aide/discord/retrouver-identifiant-discord.pdf" download>Télécharger le PDF</a></p>
      {settings.loading?<p role="status">Chargement…</p>:settings.error?<p role="alert">{settings.error} <Button onClick={settings.reload}>Réessayer</Button></p>:data&&!data.configured?<p>Discord n’est pas encore disponible. Vos notifications restent consultables dans cette page.</p>:data&&<>
        {!data.link?<>
          <ol aria-label="Associer Discord en trois étapes" style={{listStyle:"decimal",paddingLeft:"1.5rem",display:"grid",gap:16}}>
            <li><strong>Rejoindre le serveur InfiMatch</strong><p>Acceptez l’invitation et autorisez les messages privés des membres de ce serveur. Votre identifiant seul ne suffit pas pour que le bot puisse vous écrire.</p>
              <a href={discordInvite} target="_blank" rel="noopener noreferrer" className={`${buttonStyles.button} ${buttonStyles.primary} ${buttonStyles.md}`} style={{marginTop:10,height:"auto",paddingBlock:12,whiteSpace:"normal",maxWidth:"100%"}}>Rejoindre le serveur InfiMatch</a><p>Discord s’ouvre dans un nouvel onglet. Revenez ensuite sur cette page.</p>
            </li>
            <li><strong>Demander votre code privé</strong><p>Dans Discord, activez le mode développeur dans Paramètres → Développeur (ou Avancés), puis copiez l’identifiant de votre utilisateur. Collez ses 17 à 20 chiffres ci-dessous et demandez votre code.</p></li>
            <li><strong>Confirmer et choisir vos notifications</strong><p>Saisissez le code reçu en message privé, associez votre compte, puis activez les événements que vous souhaitez recevoir.</p></li>
          </ol>

          <form noValidate onSubmit={e=>{
            e.preventDefault();
            if(busy||challengePending.current) return;
            const discordUserId=discordId.trim();
            setDiscordId(discordUserId);setError("");setMessage("");setChallengeError("");setChallengeMessage("");
            if(!/^[0-9]{17,20}$/.test(discordUserId)) {
              setDiscordIdError("Saisissez votre identifiant utilisateur Discord : 17 à 20 chiffres. Ce n’est ni votre pseudo ni l’identifiant du serveur ou du salon.");
              return;
            }
            setDiscordIdError("");
            void requestDiscordCode(discordUserId);
          }}><TextField label="Votre identifiant utilisateur Discord" hint="17 à 20 chiffres : copiez l’identifiant de votre utilisateur, pas votre pseudo ni celui du serveur ou du salon." error={discordIdError} value={discordId} onChange={e=>{setDiscordId(e.target.value.trim());setDiscordIdError("");setChallengeError("");setChallengeMessage("");}} disabled={sendingCode} pattern="[0-9]{17,20}" inputMode="numeric" autoComplete="off" required/><Button type="submit" disabled={busy} loading={sendingCode}>{sendingCode?"Envoi du code en cours…":"Recevoir mon code privé"}</Button>
            {sendingCode&&<p role="status">Envoi en cours. Patientez avant de demander un nouveau code.</p>}
            {challengeError&&<div role="alert" style={{marginTop:12,padding:12,borderLeft:"3px solid var(--brand-800)",background:"var(--sky-50)"}}>
              <p><strong>L’envoi du code n’est pas confirmé.</strong></p><p>{challengeError}</p>
              <p>Vérifiez que vous avez <a href={discordInvite} target="_blank" rel="noopener noreferrer">rejoint le serveur InfiMatch et accepté l’invitation</a>, puis autorisez les messages privés des membres de ce serveur. Vérifiez aussi votre identifiant utilisateur.</p>
              <p>Revenez ici et cliquez sur « Recevoir mon code privé » pour réessayer. Si une limite de tentatives ou une panne réseau est signalée, attendez avant de relancer.</p>
            </div>}
            {challengeMessage&&<p role="status" style={{marginTop:12}}>{challengeMessage}</p>}
          </form>
          <form onSubmit={e=>{e.preventDefault();void action(()=>api(base+"/discord/verify",{method:"POST",body:{code}}),"Compte Discord associé. Choisissez maintenant les événements à recevoir.");}}><TextField label="Code reçu sur Discord" value={code} onChange={e=>setCode(e.target.value)} pattern="[0-9]{6}" inputMode="numeric" autoComplete="one-time-code" required/><Button type="submit" disabled={busy}>Associer mon compte</Button></form>
        </>:<><p>Compte Discord associé : {data.link.discord_user_id}</p><p>Vous avez quitté le serveur ? <a href={discordInvite} target="_blank" rel="noopener noreferrer">Rejoindre le serveur InfiMatch</a> puis autoriser les messages privés.</p><Button variant="outline" disabled={busy} onClick={()=>void action(()=>api(base+"/discord",{method:"DELETE"}),"Discord déconnecté. Les envois liés à cette connexion sont arrêtés.")}>Déconnecter Discord</Button>
          <h3>Mes messages privés</h3><DestinationEditor key={JSON.stringify(data.destinations.find(d=>d.user_id))} destination={data.destinations.find(d=>d.user_id)} catalog={Object.fromEntries(Object.entries(data.catalog).filter(([k])=>!["NEED_CREATED","NEED_UPDATED","MISSION_PUBLISHED","REMINDER"].includes(k)))} save={(_,body)=>action(()=>api(base+"/discord",{method:"PUT",body}),"Préférences enregistrées.")}/>
          {orgs.error&&<p role="alert">{orgs.error}</p>}{orgs.data?.organizations.map(org=><section key={org.id}><h3>{org.name} — salon de l’organisation</h3><DestinationEditor key={JSON.stringify(data.destinations.find(d=>d.organization_id===org.id))} org={org.id} destination={data.destinations.find(d=>d.organization_id===org.id)} catalog={Object.fromEntries(Object.entries(data.catalog).filter(([k])=>data.organizationKinds.includes(k)))} save={(id,body)=>action(()=>api(base+"/organizations/"+id+"/discord",{method:"PUT",body}),"Salon et préférences enregistrés.")}/></section>)}
        </>}
      </>}
    </section>
    <section className={s.card}><h2>Suivi des envois Discord</h2><Button variant="outline" onClick={deliveries.reload}>Actualiser</Button>{deliveries.error?<p role="alert">{deliveries.error}</p>:deliveries.data?.length?<ul>{deliveries.data.map(d=><li key={d.id}>{data?.catalog[d.kind]||d.kind} : {deliveryLabels[d.status]||d.status}</li>)}</ul>:<p>Aucun envoi pour le moment.</p>}</section>
  </div>;
}
