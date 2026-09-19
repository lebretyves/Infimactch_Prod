import {useRemote} from '@/lib/useRemote';
import {api} from '@/services/api';
import {Button} from '@/ui/Button';

type EmailEvent={event:string;happenedAt:string;receivedAt:string;bounceType:string|null};
export type EmailDelivery={id:string;kind:string;sendStatus:string;deliveryStatus:string;createdAt:string;acceptedAt:string|null;deliveryEventAt:string|null;events:EmailEvent[]};
export type EmailJournal={items:EmailDelivery[];limit:number;observedAt:string};
const deliveryLabels:Record<string,string>={PROCESSED:'Traitement par le service d’envoi',DELIVERED:'Livré au serveur destinataire',BOUNCED:'Rejeté par le serveur destinataire',REJECTED:'Envoi rejeté par le service',SPAM:'Signalé comme indésirable'};
const sendLabels:Record<string,string>={PENDING:'En attente',SENDING:'Transmission en cours',SENT:'Accepté par le service — livraison non confirmée',FAILED:'Échec de transmission',CANCELLED:'Envoi annulé',UNCERTAIN:'Résultat de transmission incertain'};
const eventLabels:Record<string,string>={processed:deliveryLabels.PROCESSED!,delivered:deliveryLabels.DELIVERED!,bounce:deliveryLabels.BOUNCED!,reject:deliveryLabels.REJECTED!,spam:deliveryLabels.SPAM!};
const date=(value:string|null)=>value?new Date(value).toLocaleString('fr-FR'):'Non confirmé';
export function EmailDeliveryItems({items}:{items:EmailDelivery[]}) {
  return <><p>La livraison au serveur destinataire ne prouve ni l’arrivée dans la boîte principale ni la lecture. Vérifiez aussi les indésirables. Aucun suivi d’ouverture ou de clic n’est utilisé ici.</p>
    {items.length ? <ul style={{paddingLeft:20}}>{items.map(item=><li key={item.id} style={{marginBlock:20,overflowWrap:'anywhere'}}>
      <strong>{item.kind==='CONFIRMATION'?'Confirmation de mission':'Annulation de mission'}</strong><p>{deliveryLabels[item.deliveryStatus]||sendLabels[item.sendStatus]||'État non confirmé'}</p>
      <p>Création : {date(item.createdAt)} · Acceptation par le service : {date(item.acceptedAt)}</p>
      {item.deliveryEventAt&&<p>Dernier état de livraison : {date(item.deliveryEventAt)}</p>}
      {item.sendStatus==='UNCERTAIN'&&item.deliveryStatus==='NOT_REPORTED'&&<p>L’envoi n’est pas relancé automatiquement pour éviter un doublon. Le suivi sera actualisé si le service confirme son résultat.</p>}
      {item.events.length>0&&<details><summary>Historique de livraison</summary><ul>{item.events.map((event,index)=><li key={index}>{eventLabels[event.event]||'Événement de livraison'}{event.bounceType==='soft'?' (rejet temporaire)':event.bounceType==='hard'?' (rejet permanent)':''} · {date(event.happenedAt)}</li>)}</ul></details>}
    </li>)}</ul>:<p>Aucun email de mission enregistré pour ce compte.</p>}
    <p>Les 50 derniers envois sont affichés. Les anciens emails peuvent ne pas disposer d’un retour de livraison.</p>
  </>;
}
export function EmailDeliveryJournal({userId}:{userId:string}) {
  const request=useRemote(signal=>api<EmailJournal>('/me/email-deliveries',{signal}),userId);
  return <section aria-label="Suivi de mes emails" style={{padding:24,border:'1px solid var(--line)',borderRadius:16,background:'white'}}>
    <h2>Suivi de mes emails</h2><Button variant="outline" onClick={request.reload} disabled={request.loading}>Actualiser les emails</Button>
    {request.loading?<p role="status">Chargement du suivi des emails…</p>:request.error?<p role="alert">{request.error}</p>:request.data&&<EmailDeliveryItems items={request.data.items}/>}
  </section>;
}
