import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { enterpriseMissionSearch, missionDate, statusLabels } from "@/services/market";
import { missionPages, missionReturnTo } from "@/lib/missionNavigation";
import { Button, ButtonLink } from "@/ui/Button";
import s from "./MesEtablissements.module.css";
import p from "./EntrepriseMissions.module.css";
const keys = ['q','qualification','location','date','status','shift','sort'] as const;
type Filters = Record<(typeof keys)[number],string>;
function MissionPagination({current, count, move}: {current:number;count:number;move:(page:number)=>void}) {
  const [page, setPage] = useState(String(current));
  useEffect(()=>setPage(String(current)),[current]);
  return <div className={p.pagination}>
    <nav aria-label="Pages des missions" className={p.pageButtons}>
      <Button variant="outline" size="sm" disabled={current<=1} onClick={()=>move(current-1)}>Précédent</Button>
      {missionPages(current,count).map((item,index)=>item==='gap'?<span key={`gap${index}`} aria-hidden="true">…</span>:<button key={item} type="button" className={p.pageNumber} aria-label={`Page ${item}`} aria-current={item===current?'page':undefined} onClick={()=>move(item)}>{item}</button>)}
      <Button variant="outline" size="sm" disabled={current>=count} onClick={()=>move(current+1)}>Suivant</Button>
    </nav>
    <form className={p.jump} onSubmit={event=>{event.preventDefault();const value=Number(page);if(Number.isInteger(value)&&value>=1&&value<=count)move(value);}}>
      <label htmlFor="mission-page-number">Aller à la page</label><input id="mission-page-number" type="number" min={1} max={count} step={1} required value={page} onChange={event=>setPage(event.target.value)} /><span>sur {count}</span><Button type="submit" variant="outline" size="sm">Aller</Button>
    </form>
  </div>;
}
export default function EntrepriseMissions() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const establishmentId = params.get("establishmentId") || undefined;
  const establishmentName = params.get("establishmentName") || "Établissement sélectionné";
  const editMode = params.get("mode") === "edit";
  const filters = Object.fromEntries(keys.map(key=>[key,params.get(key)||''])) as Filters;
  const filterKey = JSON.stringify(filters);
  const [draft,setDraft] = useState(filters);
  useEffect(()=>setDraft(JSON.parse(filterKey) as Filters),[filterKey]);
  const rawOffset = Number(params.get("offset"));
  const offset = Number.isFinite(rawOffset) ? Math.min(10000,Math.max(0,Math.floor(rawOffset/20)*20)) : 0;
  useEffect(() => {
    if (!params.has('offset') || params.get('offset') === String(offset)) return;
    const updated = new URLSearchParams(params);
    if (offset) updated.set('offset', String(offset)); else updated.delete('offset');
    setParams(updated, { replace: true });
  }, [params, offset, setParams]);
  const r = useRemote(signal=>enterpriseMissionSearch(offset,signal,establishmentId,filters),JSON.stringify([user?.id,offset,establishmentId,filterKey]));
  const total = r.data?.total || 0;
  const pages = Math.min(501,Math.max(1,Math.ceil(total/20)));
  const current = Math.floor(offset/20)+1;
  const outOfRange = total>0 && offset>=total;
  const returnTo = missionReturnTo('/missions?'+params.toString());
  const returnQuery = new URLSearchParams({returnTo}).toString();
  function move(page:number) { const updated = new URLSearchParams(params);if(page>1)updated.set('offset',String((page-1)*20));else updated.delete('offset');setParams(updated); }
  function search(reset=false) {
    const updated=new URLSearchParams(params);updated.delete('offset');
    for(const key of keys){const value=reset?'':draft[key].trim();if(value)updated.set(key,value);else updated.delete(key);}
    if(reset)setDraft(Object.fromEntries(keys.map(key=>[key,''])) as Filters);
    setParams(updated);
  }
  function field(key:(typeof keys)[number],value:string){setDraft(previous=>({...previous,[key]:value}));}
  return <div className={s.page}>
    <header><h1>{editMode?'Modifier une offre':establishmentId?'Missions de l’établissement':'Mes missions et leur suivi'}</h1><p>{establishmentId?(r.data?.items[0]?.establishment_name||establishmentName):'Retrouvez les vacations, leurs candidatures et leurs affectations avec les critères de votre choix.'}</p></header>
    <div className={s.actions}><ButtonLink to={'/gestion/missions/nouvelle?'+new URLSearchParams({returnTo,...(establishmentId?{establishmentId}:{})})}>Créer une mission</ButtonLink><ButtonLink to="/mes-etablissements" variant="outline">Mes établissements</ButtonLink>{establishmentId&&<ButtonLink to={editMode?'/missions?mode=edit':'/missions'} variant="outline">Tous les établissements</ButtonLink>}</div>
    <form className={p.search} onSubmit={event=>{event.preventDefault();search();}}>
      <div className={p.wide}><label htmlFor="mission-q">Intitulé ou service</label><input id="mission-q" type="search" maxLength={150} value={draft.q} onChange={event=>field('q',event.target.value)} placeholder="Ex. remplacement, dialyse…" /></div>
      <div><label htmlFor="mission-qualification">Métier</label><select id="mission-qualification" value={draft.qualification} onChange={event=>field('qualification',event.target.value)}><option value="">Tous les métiers</option>{['IDE','IADE','IBODE'].map(value=><option key={value}>{value}</option>)}</select></div>
      <div><label htmlFor="mission-location">Lieu ou établissement</label><input id="mission-location" type="search" maxLength={150} value={draft.location} onChange={event=>field('location',event.target.value)} placeholder="Ville, nom ou FINESS" /></div>
      <div><label htmlFor="mission-date">Date de vacation</label><input id="mission-date" type="date" value={draft.date} onChange={event=>field('date',event.target.value)} aria-describedby="mission-date-help" /></div>
      <div><label htmlFor="mission-status">Statut</label><select id="mission-status" value={draft.status} onChange={event=>field('status',event.target.value)}><option value="">Tous les statuts</option>{['OPEN','DRAFT','FILLED','COMPLETED','CANCELLED'].map(value=><option value={value} key={value}>{statusLabels[value]||value}</option>)}</select></div>
      <div><label htmlFor="mission-shift">Horaires</label><select id="mission-shift" value={draft.shift} onChange={event=>field('shift',event.target.value)}><option value="">Tous les horaires</option><option value="DAY">Jour</option><option value="NIGHT">Nuit</option><option value="MIXED">Jour et nuit</option><option value="UNKNOWN">Non connus</option></select></div>
      <div><label htmlFor="mission-sort">Trier par</label><select id="mission-sort" value={draft.sort || "created_desc"} onChange={event=>field('sort',event.target.value)}><option value="created_desc">Création la plus récente</option><option value="start_asc">Date de début croissante</option><option value="start_desc">Date de début décroissante</option></select></div>
      <div className={p.searchActions}><p id="mission-date-help">Date locale de l’établissement, y compris les vacations de nuit en cours ce jour-là.</p><div className={s.actions}><Button type="button" variant="ghost" onClick={()=>search(true)}>Réinitialiser</Button><Button type="submit">Rechercher</Button></div></div>
    </form>
    {r.loading?<p role="status">Chargement des missions…</p>:r.error?<div role="alert"><p>{r.error}</p><Button onClick={r.reload}>Réessayer</Button></div>:<>
      <p className={p.result} aria-live="polite"><strong>{total.toLocaleString('fr-FR')} mission(s)</strong>{total>0&&!outOfRange?` · ${offset+1}–${Math.min(offset+20,total)} · page ${current} sur ${pages}`:''}</p>
      {outOfRange?<div className={s.empty}><p>Cette page n’est plus disponible pour les critères sélectionnés.</p><Button onClick={()=>move(1)}>Revenir à la première page</Button></div>:<div className={s.list}>{r.data?.items.map(m=><article key={m.id} className={s.mission}><p className={s.site}>{m.establishment_name||(establishmentId?establishmentName:'Établissement non renseigné')}</p><h2>{m.title}</h2><p>{statusLabels[m.status||'']||'État à vérifier'} · {m.qualification}</p><p>{missionDate(m)} → {missionDate(m,true)} · {m.schedule_precision==='DATE'?'Horaires précis à confirmer':'heure locale'}</p><div className={s.actions}>{editMode&&m.can_manage&&['OPEN','DRAFT'].includes(m.status||'')&&<ButtonLink to={'/gestion/missions/'+m.id+'/modifier?'+returnQuery} size="sm">Modifier cette offre</ButtonLink>}<ButtonLink to={'/gestion/missions/'+m.id+'?'+returnQuery} variant="outline" size="sm">Mission et candidatures</ButtonLink></div></article>)}{!r.data?.items.length&&<p className={s.empty}>Aucune mission ne correspond à cette recherche.{offset>0&&<Button variant="ghost" onClick={()=>move(1)}>Revenir à la première page</Button>}</p>}</div>}
      {total>0&&!outOfRange&&<MissionPagination current={current} count={pages} move={move}/>}
    </>}
  </div>;
}
