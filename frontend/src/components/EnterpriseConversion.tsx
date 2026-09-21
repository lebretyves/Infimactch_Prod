import {useState,type FormEvent} from 'react';
import {useRemote} from '@/lib/useRemote';
import {api} from '@/services/api';
import {organizations} from '@/services/organizations';
import {Button} from '@/ui/Button';
import {SelectField,TextField} from '@/ui/Field';
import s from './EnterpriseConversion.module.css';

type Rate={numerator:number;denominator:number;percent:number|null};
type Report={organization:{name:string};period:{from:string;to:string;timeZone:string};observedAt:string;fillRate:Rate;selectionRate:Rate;missionCancellationRate:Rate;assignmentCancellationRate:Rate;fillDelay:{averageHours:number|null;samples:number};exclusions:{demoMissions:number;undatedPublications:number;undatedApplications:number};definitions:{fill:string;selection:string;cancellation:string;delay:string;history:string}};
const today=()=>new Date().toISOString().slice(0,10);
const initial=()=>({from:new Date(Date.now()-29*86400000).toISOString().slice(0,10),to:today()});
function Metric({label,rate,scope}:{label:string;rate:Rate;scope:string}) {
  return <div className={s.metric}>
    <dt>{label}</dt>
    <dd>
      <strong className={s.metricValue}>{rate.percent===null?'Non calculable':rate.percent.toLocaleString('fr-FR')+' %'}</strong>
      <p className={s.metricCount}>{rate.numerator} / {rate.denominator}</p>
      <p className={s.metricScope}>{scope}</p>
      {rate.denominator===0&&<p className={s.metricEmpty}>Aucun élément dans cette cohorte.</p>}
    </dd>
  </div>;
}
export function EnterpriseConversion({userId}:{userId:string}){
  const orgs=useRemote(organizations,userId+':conversion-organizations');
  const [chosen,setChosen]=useState(''),[draft,setDraft]=useState(initial),[period,setPeriod]=useState(initial);
  const organizationId=chosen||orgs.data?.organizations[0]?.id||'';
  const report=useRemote(signal=>organizationId?api<Report>('/dashboards/conversions?'+new URLSearchParams({organizationId,...period}),{signal}):Promise.resolve(null),[userId,organizationId,period.from,period.to].join(':'));
  function submit(event:FormEvent){event.preventDefault();if(draft.from&&draft.to){if(draft.from===period.from&&draft.to===period.to)report.reload();else setPeriod({...draft});}}
  return <section aria-labelledby="enterprise-conversion-title" className={s.report}>
    <header className={s.heading}>
      <p className={s.eyebrow}>Suivre vos résultats</p>
      <h2 id="enterprise-conversion-title">Résultats des recrutements</h2>
      <p>Résultats actuels de groupes constitués sur la période choisie. Les dates sont interprétées en UTC. Les offres externes et les jeux fictifs identifiés sont exclus.</p>
    </header>
    {orgs.loading?<p role="status">Chargement des organisations…</p>:orgs.error?<p role="alert">{orgs.error} <Button onClick={orgs.reload}>Réessayer</Button></p>:!orgs.data?.organizations.length?<p>Aucune organisation active disponible.</p>:<>
      <form onSubmit={submit} className={s.filters}>
        <SelectField label="Organisation à mesurer" value={organizationId} onChange={e=>setChosen(e.target.value)}>{orgs.data.organizations.map(org=><option key={org.id} value={org.id}>{org.name}</option>)}</SelectField>
        <TextField label="Du (inclus, UTC)" type="date" min="2000-01-01" max={draft.to||today()} value={draft.from} onChange={e=>setDraft(v=>({...v,from:e.target.value}))} required/>
        <TextField label="Au (inclus, UTC)" type="date" min={draft.from||'2000-01-01'} max={today()} value={draft.to} onChange={e=>setDraft(v=>({...v,to:e.target.value}))} required/>
        <Button type="submit" disabled={report.loading}>Calculer</Button>
      </form><p className={s.hint}>Période maximale : 366 jours. Changer les dates puis calculer ; aucune actualisation automatique.</p>
      {report.loading?<p role="status">Calcul des cohortes…</p>:report.error?<p role="alert">{report.error} <Button onClick={report.reload}>Réessayer</Button></p>:report.data&&<>
        <p className={s.observed}><strong>{report.data.organization.name}</strong> · Du {report.data.period.from} au {report.data.period.to}, inclus · État observé le {new Date(report.data.observedAt).toLocaleString('fr-FR',{timeZone:'UTC'})} UTC</p>
        <dl className={s.metrics}>
          <Metric label="Missions pourvues" rate={report.data.fillRate} scope="Missions de première publication connue dans la période, avec une affectation encore active ou terminée."/>
          <Metric label="Candidatures ayant abouti à une affectation" rate={report.data.selectionRate} scope="Candidatures dont la soumission initiale est attestée dans la période ; affectation même annulée ensuite."/>
          <Metric label="Missions annulées" rate={report.data.missionCancellationRate} scope="Missions publiées dans la période et actuellement annulées."/>
          <Metric label="Affectations annulées" rate={report.data.assignmentCancellationRate} scope="Affectations créées dans la période et actuellement annulées."/>
        </dl>
        <p className={s.delay}><strong>Délai moyen de pourvoi :</strong> {report.data.fillDelay.averageHours===null?'Non calculable':report.data.fillDelay.averageHours.toLocaleString('fr-FR')+' heures'} · {report.data.fillDelay.samples} mission(s) mesurable(s), de la publication à la première affectation encore active ou terminée.</p>
        <details className={s.explanations}><summary>Données exclues et qualité des résultats</summary><p>Sur cette organisation, toutes dates confondues : {report.data.exclusions.demoMissions} mission(s) fictive(s) identifiée(s) exclue(s) ; {report.data.exclusions.undatedPublications} publication(s) et {report.data.exclusions.undatedApplications} candidature(s) sans date initiale attestée, hors cohortes. Ces données manquantes peuvent limiter la représentativité des taux.</p></details>
        <details className={s.explanations}><summary>Définitions et limites des indicateurs</summary>{Object.values(report.data.definitions).map(text=><p key={text}>{text}</p>)}<p>Une annulation peut modifier le pourvoi courant sans effacer le fait qu’une candidature a déjà été acceptée. Les statistiques ne mesurent ni les consultations ni le nombre de personnes ayant vu une offre.</p></details>
      </>}
    </>}
  </section>;
}
