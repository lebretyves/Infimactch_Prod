import {useRef,useState} from 'react';
import {useRemote} from '@/lib/useRemote';
import {api} from '@/services/api';
import {Button} from '@/ui/Button';
import {TextField,SelectField} from '@/ui/Field';
export const personalFieldLabels:Record<string,string>={firstName:'Prénom',lastName:'Nom',email:'E-mail',city:'Ville',phone:'Téléphone',birthDate:'Date de naissance',address:'Adresse postale',postalCode:'Code postal'};
type Correction={id:string;field:string;proposed_value:string;status:string;decision_reason:string|null};
export function PersonalCorrectionRequest(){
 const remote=useRemote(signal=>api<{request:Correction|null}>('/me/personal-corrections',{signal}),'personal-corrections');
 const [open,setOpen]=useState(false),[field,setField]=useState('firstName'),[value,setValue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');const pending=useRef(false);
 async function send(){if(pending.current)return;pending.current=true;setBusy(true);setError('');setMessage('');try{await api('/me/personal-corrections',{method:'POST',body:{field,value}});setValue('');setOpen(false);setMessage('Votre demande a été envoyée à l’administration. Vos informations restent inchangées jusqu’à sa validation.');remote.reload();}catch(e){setError(e instanceof Error?e.message:'La demande n’a pas pu être envoyée.');}finally{pending.current=false;setBusy(false);}}
 const request=remote.data?.request;
 return <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr)',minWidth:0,gap:12,marginTop:16}} aria-label="Correction de mes informations personnelles">
 {remote.loading?<p role="status">Chargement des demandes…</p>:remote.error?<><p role="alert">{remote.error}</p><Button type="button" variant="outline" onClick={remote.reload}>Réessayer</Button></>:<>
 {request&&<p>{request.status==='REQUESTED'?'Demande en cours':request.status==='COMPLETED'?'Correction validée — actualisez votre profil':'Demande refusée'} : {personalFieldLabels[request.field]}. {request.decision_reason}</p>}
 {request?.status!=='REQUESTED'&&<Button type="button" style={{whiteSpace:'normal'}} variant="outline" onClick={()=>setOpen(!open)}>Demander une correction à l’administrateur</Button>}
 {open&&request?.status!=='REQUESTED'&&<div style={{display:'grid',gap:12}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void send();}}}>
 <SelectField label="Information à corriger" value={field} disabled={busy} onChange={e=>{setField(e.target.value);setValue('');}}>{Object.entries(personalFieldLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</SelectField>
 <TextField label="Nouvelle valeur demandée" type={field==='birthDate'?'date':'text'} value={value} maxLength={500} disabled={busy} onChange={e=>setValue(e.target.value)}/>
 <p>L’administrateur vérifiera votre demande avant de modifier cette information. Une seule demande peut être en cours à la fois.</p>
 <Button type="button" loading={busy} onClick={()=>void send()}>Envoyer la demande de correction</Button></div>}
 </>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </div>;
}
