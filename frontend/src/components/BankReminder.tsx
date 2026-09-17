import { Link } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useRemote } from '@/lib/useRemote';
import { api } from '@/services/api';
export function BankReminder() {
  const {user}=useAuth();
  const result=useRemote(signal=>api<{required:boolean;iban:string|null;document:{id:string}|null}>('/me/bank-details',{signal}),user?.id||'');
  if(!result.data?.required||result.data.iban||result.data.document)return null;
  return <aside aria-label="RIB à compléter" style={{padding:16,borderLeft:'3px solid var(--teal-700)',background:'var(--sky-50)'}}><p><strong>Votre première mission est validée : pensez à compléter votre RIB.</strong> <Link to="/dossier#rib">Ajouter mon RIB dans mon dossier</Link>.</p><p>Ce rappel ne bloque pas votre mission. Dans ce projet de démonstration, utilisez uniquement des données fictives.</p></aside>;
}
