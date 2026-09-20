import {Link} from "react-router";
import {useState} from "react";
import {useRemote} from "@/lib/useRemote";
import {api} from "@/services/api";
import {Button} from "@/ui/Button";
export function NotificationPreferences({userId}:{userId:string}) {
 const r=useRemote(signal=>api<{enabled:boolean}>("/me/notification-preferences",{signal}),userId);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function toggle(){if(!r.data||busy)return;setBusy(true);setError("");setMessage("");try{await api("/me/notification-preferences",{method:"PUT",body:{enabled:!r.data.enabled}});setMessage("Préférence enregistrée.");r.reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div><h3>Alertes de correspondance</h3><p>Recevoir dans votre espace les nouvelles missions correspondant à votre profil. La ville et le rayon de votre zone de recherche et d’alertes limitent les missions proposées. Une recherche ponctuelle ne modifie pas cette zone. Les confirmations d’affectation restent disponibles.</p><p><Link to="/calendrier#zone-mobilite">Modifier ma zone de recherche et d’alertes</Link></p>{r.loading?<p role="status">Chargement des préférences…</p>:r.error?<p role="alert">{r.error} <Button onClick={r.reload}>Réessayer</Button></p>:<Button variant="outline" role="switch" aria-checked={!!r.data?.enabled} disabled={busy} onClick={()=>void toggle()}>{r.data?.enabled?"Alertes activées":"Alertes désactivées"}</Button>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}</div>;
}
