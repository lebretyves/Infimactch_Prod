import { Link } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useRemote } from '@/lib/useRemote';
import { api } from '@/services/api';
export function BankReminder() {
  const {user}=useAuth();
  const result=useRemote(signal=>api<{required:boolean;suggested:boolean;iban:string|null;document:{id:string}|null}>('/me/bank-details',{signal}),user?.id||'');
  if(!result.data?.suggested||result.data.iban||result.data.document)return null;
  return <aside aria-label="RIB facultatif" style={{padding:16,borderLeft:'3px solid var(--teal-700)',background:'var(--sky-50)'}}><p><strong>Votre première mission est validée : vous pouvez ajouter un RIB si vous le souhaitez.</strong> <Link to="/dossier#rib">Ajouter mon RIB dans mon dossier</Link>.</p><p>Votre agence employeur assure votre rémunération. Cet ajout est facultatif et ne bloque ni vos candidatures ni vos missions.</p></aside>;
}
