import {DataState,useData} from './App';
import {EmailDeliveryItems,type EmailDelivery} from '@/components/EmailDeliveryJournal';
export function AccountEmails({id,version}:{id:string;version:number}) {
  const request=useData(`/accounts/${encodeURIComponent(id)}/email-deliveries`,version);
  return <section className="admin-panel"><h2>Emails de mission</h2><p>Consultation du suivi de ce compte. Aucune action de renvoi n’est effectuée depuis cet écran.</p><DataState request={request}>{data=><EmailDeliveryItems items={(data.items||[]) as EmailDelivery[]}/>}</DataState></section>;
}
