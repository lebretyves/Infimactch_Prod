import type { Assignment } from '@/services/nurse';
import { ButtonLink } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { AddToPersonalCalendar } from '@/components/AddToPersonalCalendar';
import u from '@/components/NurseUI.module.css';
import s from './UpcomingMissions.module.css';
type UpcomingAssignment = Assignment & { address?: string | null; organization_name?: string | null; establishment_name?: string | null };
export function UpcomingMissions({ assignments, limit = 3 }: { assignments: UpcomingAssignment[]; limit?: number }) {
 const now=Date.now();
 const missions=assignments.filter(m=>m.status==='ACTIVE' && Number.isFinite(Date.parse(m.start_at)) && Date.parse(m.end_at)>now).sort((a,b)=>Date.parse(a.start_at)-Date.parse(b.start_at));
 return <section className={u.card} aria-labelledby="upcoming-missions-title">
  <h2 id="upcoming-missions-title" className={u.cardHeading}><Icon name="calendar"/>Missions à venir</h2>
  {missions.length ? <ul className={s.list}>{missions.slice(0,limit).map(m=>{
   let zone=m.timezone||'Europe/Paris';try{new Intl.DateTimeFormat('fr-FR',{timeZone:zone});}catch{zone='Europe/Paris';}
   const format=(v:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('fr-FR',{...options,timeZone:zone}).format(new Date(v));
   const sameDay=format(m.start_at,{dateStyle:'short'})===format(m.end_at,{dateStyle:'short'});
   const place=m.organization_name||m.establishment_name;
   return <li key={m.id} className={s.mission}>
    <div className={s.top}><time dateTime={m.start_at}>{format(m.start_at,{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</time><span className={s.status}>{Date.parse(m.start_at)<=now?'En cours':'Confirmée'}</span></div>
    <strong className={s.title}>{m.title}</strong>
    <p className={s.hours}>{format(m.start_at,{timeStyle:'short'})} – {sameDay?'':format(m.end_at,{day:'numeric',month:'short'})+' à '}{format(m.end_at,{timeStyle:'short'})}</p>
    <p className={s.zone}>Heure locale · {zone}</p>
    <div className={s.place}><Icon name="building" size={16}/><div>{place&&<strong>{place}</strong>}<span>{m.address||'Lieu à consulter dans la mission'}</span></div></div>
    <div className={s.actions}>
      <ButtonLink to={'/missions/m_'+encodeURIComponent(m.mission_id)} aria-label={'Voir la mission : '+m.title} variant="outline" size="sm" block className={s.action}>Voir la mission →</ButtonLink>
      <AddToPersonalCalendar assignment={m} />
    </div>
   </li>;
  })}</ul>:<p className={u.muted}>Aucune mission confirmée à venir pour le moment.</p>}
  <ButtonLink to="/historique" variant="outline" size="sm" className={s.all}>Toutes mes missions confirmées →</ButtonLink>
 </section>;
}
