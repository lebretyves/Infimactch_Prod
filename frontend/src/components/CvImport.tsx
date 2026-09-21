import {useEffect,useRef,useState} from 'react';
import {api} from '@/services/api';
import {Link} from 'react-router';
import {acceptsCv,DOCX_MIME,isCvDocx} from '@/lib/cvDocx';
import {CvProfileReview} from './CvProfileReview';
import type {CvSuggestions} from '@/lib/cvReview';
import type {ProfessionalProfile} from '@/services/profile';
import type {Experience} from '@/services/profile';
import {wholeDayPeriod} from '@/lib/datePeriods';
import {Button} from '@/ui/Button';
import {TextField,SelectField} from '@/ui/Field';
import {labelCode} from '@/data/professional';
type Suggestion={establishment:string;service:string;startDate:string;endDate:string;periodLabel:string;evidence:string;warnings:string[];selected:boolean};
type Result={experiences:Omit<Suggestion,'selected'>[];warnings:string[];suggestions?:CvSuggestions};
export function CvImport({services,existing,onAdd,addBlocked=false,profile,onProfileApply}:{profile?:ProfessionalProfile;onProfileApply?:(value:Partial<ProfessionalProfile>)=>void;addBlocked?:boolean;services:string[];existing:Experience[];onAdd:(values:Experience[])=>void}){
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[rows,setRows]=useState<Suggestion[]>([]),[warnings,setWarnings]=useState<string[]>([]),[reviewed,setReviewed]=useState(false);
 const [textPreview,setTextPreview]=useState('');
 const [cvFile,setCvFile]=useState<File|null>(null),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[saveError,setSaveError]=useState('');
 const saveKey=useRef(''),savingRef=useRef(false);
 async function saveCv(){
  if(!cvFile||savingRef.current||saved)return;
  if(cvFile.size>3*1024*1024){setSaveError('Pour conserver le CV dans Mes documents, choisissez un fichier de 3 Mo maximum.');return;}
  savingRef.current=true;setSaving(true);setSaveError('');
  try{
   const contentBase64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Lecture du CV impossible.'));reader.readAsDataURL(cvFile);});
   const mime=isCvDocx(cvFile)?DOCX_MIME:cvFile.type;
   await api('/me/cv-document',{method:'POST',key:saveKey.current,body:{mime,contentBase64,reviewed:true}});
   setSaved(true);
  }catch(e){setSaveError(e instanceof Error?e.message:'Enregistrement du CV impossible. Réessayez.');}
  finally{savingRef.current=false;setSaving(false);}
 }

 const [suggestions,setSuggestions]=useState<CvSuggestions|null>(null),[reviewVersion,setReviewVersion]=useState(0);
 const current=useRef<AbortController|null>(null);useEffect(()=>()=>current.current?.abort(),[]);
 function cancel(){setTextPreview('');current.current?.abort();current.current=null;setBusy(false);setProgress('');}
 async function choose(file:File|undefined){if(!file||savingRef.current)return;setCvFile(null);setSaved(false);setSaveError('');cancel();setSuggestions(null);setRows([]);setWarnings([]);setReviewed(false);setError('');setMessage('');if(!acceptsCv(file)){setError('Choisissez un CV PDF, DOCX, JPEG ou PNG de 5 Mo maximum.');return;}setCvFile(file);saveKey.current=crypto.randomUUID();const controller=new AbortController();current.current=controller;setBusy(true);setProgress('Préparation du CV…');
  let timeout:number|undefined,extractedPreview='';
  try{const result=await Promise.race([(async()=>{const {extractCvText}=await import('@/lib/cvText');if(controller.signal.aborted)throw Error('Analyse interrompue.');const text=await extractCvText(file,controller.signal,value=>{if(current.current===controller)setProgress(value);});extractedPreview=text.slice(0,4000);if(!text.trim())throw Error('Aucun texte lisible dans ce CV. Essayez un fichier plus net.');if(text.length>60000)throw Error('Le CV contient trop de texte.');if(controller.signal.aborted)throw Error('Analyse interrompue.');setProgress('Repérage des informations du CV…');return api<Result>('/profile/cv/parse',{method:'POST',body:{text},signal:controller.signal});})(),new Promise<never>((_,reject)=>{timeout=window.setTimeout(()=>{controller.abort();reject(Error('L’analyse a dépassé une minute. Essayez un CV plus court ou saisissez vos expériences.'));},60000);})]);if(current.current!==controller)return;setRows(result.experiences.map(row=>({...row,selected:true})));setWarnings(result.warnings);setSuggestions(result.suggestions||null);setReviewVersion(v=>v+1);setTextPreview(result.experiences.length?'':extractedPreview);}
  catch(e){if(current.current===controller)setError(e instanceof Error?e.message:'Analyse impossible.');}
  finally{clearTimeout(timeout);if(current.current===controller){setBusy(false);setProgress('');}}
 }
 function edit(index:number,value:Partial<Suggestion>){setRows(old=>old.map((row,i)=>i===index?{...row,...value}:row));setReviewed(false);setError('');}
 function apply(){setError('');if(!reviewed||addBlocked)return;const selected=rows.filter(row=>row.selected);if(!selected.length){setError('Sélectionnez au moins une expérience.');return;}const additions:Experience[]=[];let duplicates=0;
  for(const row of selected){const period=wholeDayPeriod(row.startDate,row.endDate);if(!period||Date.parse(period.end)>Date.now()||!services.includes(row.service)){setError('Vérifiez les dates passées et sélectionnez un service pour chaque expérience retenue.');return;}const value={...period,service:row.service,...(row.establishment.trim()?{establishment:row.establishment.trim()}: {})};const same=(e:Experience)=>e.service===value.service&&(e.establishment||'').trim().toLocaleLowerCase('fr-FR')===(value.establishment||'').toLocaleLowerCase('fr-FR')&&Date.parse(e.start)===Date.parse(value.start)&&Date.parse(e.end)===Date.parse(value.end);if([...existing,...additions].some(same)){duplicates++;continue;}additions.push(value);}
  if(existing.length+additions.length>100){setError('Votre profil est limité à 100 expériences. Réduisez la sélection.');return;}
  onAdd(additions);setRows([]);setReviewed(false);setMessage(`${additions.length} expérience(s) ajoutée(s) au formulaire${duplicates?`, ${duplicates} doublon(s) ignoré(s)`:''}. Enregistrez votre profil pour les conserver.`);
 }
 return <section aria-label="Import des informations depuis un CV" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr)',minWidth:0,gap:12,marginBlock:20,overflowWrap:'anywhere'}}>
 <h3>Préremplir mon profil avec mon CV</h3>{addBlocked&&<p role="status">Vous pouvez analyser votre CV. Enregistrez ou annulez l’expérience en cours de modification avant d’ajouter les expériences proposées.</p>}<p>Importez votre CV : les informations reconnues seront proposées pour vérification, correction et sélection. Le texte est analysé par InfiMatch, sans service tiers ; vous pouvez ensuite conserver le fichier avec « Enregistrer le CV dans mes documents ». Aucune donnée n’est enregistrée automatiquement. Votre identité reste protégée et les diplômes proposés ne sont pas certifiés.</p>
 <label>Importer mon CV (PDF, DOCX, JPEG ou PNG)<input type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,image/jpeg,image/png" disabled={busy||saving} style={{display:'block',maxWidth:'100%',width:'100%'}} onChange={e=>{void choose(e.target.files?.[0]);e.target.value='';}}/></label><p>5 Mo maximum · 5 pages PDF · une minute d’analyse maximum.</p>
 {cvFile&&<div><p>CV sélectionné : {cvFile.name}</p><Button type="button" variant="outline" disabled={busy||saving||saved} onClick={()=>void saveCv()}>{saved?'CV enregistré':saving?'Enregistrement du CV…':'Enregistrer le CV dans mes documents'}</Button><p>Le stockage du fichier est indépendant des informations appliquées au profil. 3 Mo maximum pour l’enregistrement.</p>{saved&&<p role="status">Votre CV est enregistré. <Link to="/dossier#justificatifs">Voir mes documents</Link></p>}{saveError&&<p role="alert">{saveError}</p>}</div>}
 {busy&&<><p role="status">{progress}</p><Button type="button" variant="outline" onClick={cancel}>Annuler l’analyse du CV</Button></>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 {suggestions&&profile&&onProfileApply&&<><CvProfileReview key={reviewVersion} suggestions={suggestions} profile={profile} onApply={onProfileApply}/><Button type="button" variant="ghost" style={{whiteSpace:'normal'}} onClick={()=>setSuggestions(null)}>Abandonner les propositions de diplômes, coordonnées et compétences</Button></>}
 {warnings.length>0&&<ul>{warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>}
 {textPreview&&rows.length===0&&<details><summary>Voir un aperçu du texte lu dans mon CV</summary><p>Aperçu limité à 4 000 caractères, conservé uniquement pendant cet import sur cet appareil. Vérifiez si les dates et les intitulés sont lisibles.</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontFamily:'inherit'}}>{textPreview}</pre></details>}
 {rows.length>0&&<><p>{rows.length} expérience(s) proposée(s). Vérifiez les dates, le service et l’établissement avec votre CV.</p>{rows.map((row,i)=><div key={i} style={{border:'1px solid var(--line)',padding:12,display:'grid',gap:10}}>
 <label><input type="checkbox" checked={row.selected} onChange={e=>edit(i,{selected:e.target.checked})}/> Retenir l’expérience proposée {i+1}</label>
 <details><summary>Extrait du CV — {row.periodLabel}</summary><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.evidence}</p></details>
 {row.warnings.map((w,j)=><p key={j}>{w}</p>)}
 <TextField label={`Établissement proposé ${i+1}`} value={row.establishment} maxLength={150} onChange={e=>edit(i,{establishment:e.target.value})}/>
 <SelectField label={`Service proposé ${i+1}`} value={row.service} onChange={e=>edit(i,{service:e.target.value})}><option value="">Sélectionner le service</option>{services.map(code=><option key={code} value={code}>{labelCode(code)}</option>)}</SelectField>
 <TextField label={`Début proposé ${i+1}`} type="date" value={row.startDate} onChange={e=>edit(i,{startDate:e.target.value})}/><TextField label={`Fin proposée ${i+1}`} type="date" value={row.endDate} onChange={e=>edit(i,{endDate:e.target.value})}/>
 </div>)}<label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> J’ai vérifié les expériences retenues et leurs dates avec mon CV.</label><Button type="button" style={{whiteSpace:'normal'}} disabled={!reviewed||busy||addBlocked} onClick={apply}>Ajouter les expériences vérifiées au profil</Button><Button type="button" variant="ghost" onClick={()=>{setRows([]);setReviewed(false);}}>Abandonner les propositions</Button></>}
 </section>;
}
