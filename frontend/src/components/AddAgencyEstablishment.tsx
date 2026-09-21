import { useRef, useState, type FormEvent } from 'react';
import { api } from '@/services/api';
import type { Organization } from '@/services/organizations';
import { Button } from '@/ui/Button';
import { SelectField, TextField } from '@/ui/Field';
import s from '@/pages/MesEtablissements.module.css';
type Finess = { finess:string; name:string; address?:string; city?:string; postal_code?:string };
export function AddAgencyEstablishment({agencies,onAdded,onClose}:{agencies:Organization[];onAdded:(message:string)=>void;onClose:()=>void}) {
 const [agencyId,setAgencyId]=useState(agencies[0]?.id||'');
 const [draft,setDraft]=useState({name:'',address:'',referent:'',finess:''});
 const [query,setQuery]=useState(''),[results,setResults]=useState<Finess[]|null>(null),[searching,setSearching]=useState(false),[searchError,setSearchError]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef(false),receipt=useRef({body:'',key:crypto.randomUUID()});
 async function search(e:FormEvent){e.preventDefault();if(searching)return;setSearching(true);setSearchError('');setResults(null);try{const r=await api<{items:Finess[]}>('/reference-data/finess?'+new URLSearchParams({q:query.trim(),limit:'10',offset:'0'}));setResults(r.items);}catch(e){setSearchError((e as Error).message);}finally{setSearching(false);}}
 async function submit(e:FormEvent){e.preventDefault();if(pending.current)return;pending.current=true;setBusy(true);setError('');try{
  const body={name:draft.name.trim(),address:draft.address.trim(),referent:draft.referent.trim(),...(draft.finess.trim()?{finess:draft.finess.trim().toUpperCase()}:{})};
  const content=JSON.stringify({agencyId,...body});if(receipt.current.body!==content)receipt.current={body:content,key:crypto.randomUUID()};
  const r=await api<{id:string;alreadyLinked:boolean}>('/agencies/'+agencyId+'/establishments',{method:'POST',body,key:receipt.current.key});
  onAdded(r.alreadyLinked?'Cet établissement est déjà présent dans votre liste.':'Établissement ajouté à votre agence.');
 }catch(e){setError((e as Error).message);}finally{pending.current=false;setBusy(false);}}
 return <section className={s.addPanel} aria-labelledby="add-establishment-title">
  <h2 id="add-establishment-title">Ajouter un établissement</h2>
  <p>Recherchez ses informations dans FINESS ou renseignez directement la fiche ci-dessous.</p>
  <form className={s.search} onSubmit={search}>
   <TextField label="Rechercher dans FINESS" value={query} onChange={e=>setQuery(e.target.value)} minLength={2} maxLength={100} required placeholder="Nom ou numéro FINESS" disabled={searching||busy}/>
   <Button type="submit" loading={searching} disabled={busy}>Rechercher dans l’annuaire</Button>
  </form>
  {searchError&&<p role="alert">{searchError} Vous pouvez renseigner la fiche manuellement.</p>}
  {results&&<div className={s.finessResults} aria-live="polite">{results.length?results.map(item=><div key={item.finess}><p><strong>{item.name}</strong><br/>FINESS {item.finess} · {item.city}</p><Button variant="outline" disabled={busy} onClick={()=>{setDraft(v=>({...v,name:item.name,address:[item.address,item.postal_code,item.city].filter(Boolean).join(' '),finess:item.finess}));setResults(null);}}>Utiliser cette fiche<span className={s.srOnly}> {item.name}</span></Button></div>):<p>Aucun résultat. Vous pouvez renseigner la fiche manuellement.</p>}</div>}
  <form onSubmit={submit} className={s.addFields}>
   <fieldset disabled={busy} className={s.addFields}>
    {agencies.length>1&&<SelectField label="Agence de rattachement" value={agencyId} onChange={e=>setAgencyId(e.target.value)}>{agencies.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</SelectField>}
    <TextField label="Nom de l’établissement" value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))} required minLength={2} maxLength={150}/>
    <TextField label="Adresse complète" value={draft.address} onChange={e=>setDraft(v=>({...v,address:e.target.value}))} required minLength={5} maxLength={500}/>
    <TextField label="Référent et coordonnées de contact" value={draft.referent} onChange={e=>setDraft(v=>({...v,referent:e.target.value}))} required minLength={2} maxLength={150}/>
    <TextField label="FINESS" optional value={draft.finess} onChange={e=>setDraft(v=>({...v,finess:e.target.value.toUpperCase().replace(/\s/g,'')}))} pattern="(?:[0-9]{9}|2[AB][0-9]{7})" maxLength={9}/>
   </fieldset>
   <p>Cette fiche est ajoutée à votre agence. Elle ne donne pas accès au compte de l’établissement.</p>
   {error&&<p role="alert">{error}</p>}
   <div className={s.actions}><Button type="submit" loading={busy}>Ajouter à mon agence</Button><Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Annuler</Button></div>
  </form>
 </section>;
}
