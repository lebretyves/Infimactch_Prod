import {useRemote} from "@/lib/useRemote";
import {api} from "@/services/api";
import {Button} from "@/ui/Button";
import s from "@/pages/MarketPages.module.css";
const labels: Record<string,string>={contract:"Contrat",qualification:"Qualification",service:"Expérience dans le service",experience:"Durée d’expérience",location:"Mobilité",shift:"Horaires",availability:"Disponibilités",assignmentConflicts:"Conflits de planning",requiredSkills:"Compétences requises",rpps:"Numéro RPPS",professionalEligibility:"Admissibilité professionnelle"};
const states: Record<string,string>={MATCH:"Concordance des informations",MISMATCH:"Écart constaté",INDICATIVE_MATCH:"Concordance indicative",INDICATIVE_MISMATCH:"Écart indicatif",PROFILE_MISSING:"Information à compléter dans votre profil",OFFER_MISSING:"Information insuffisante dans l’annonce",REVIEW_REQUIRED:"Vérification nécessaire"};
const reasons:Record<string,string>={RPPS_FOUND_NOT_FULL_ELIGIBILITY:"Le numéro est trouvé dans l’annuaire ; cela ne prouve pas l’identité ni l’admissibilité complète.",EXACT_DATES_REQUIRED:"Les dates précises de mission manquent pour comparer votre planning.",PROVIDER_REQUIREMENTS_NOT_MAPPED:"Les mentions de l’annonce ne constituent pas encore des exigences métier vérifiées.",TITLE_SERVICE_VS_DECLARED_EXPERIENCE:"Comparaison du service du titre avec votre expérience déclarée.",DECLARED_QUALIFICATION_COMPARISON:"Comparaison avec les qualifications de votre profil.",TOTAL_DECLARED_EXPERIENCE_NOT_SERVICE_ELIGIBILITY:"Comparaison indicative de l’expérience totale, sans validation de l’expérience dans le service."};
function comparisonValue(value:unknown):string {
 if(typeof value==="string") return ({DAY:"Jour",NIGHT:"Nuit"} as Record<string,string>)[value] || value.replace(/_/g," ");
 if(value && typeof value==="object") {
  const v=value as Record<string,unknown>;
  if(typeof v.approximateDistanceKm==="number") return `Distance indicative : ${v.approximateDistanceKm.toLocaleString("fr-FR")} km`;
  if(typeof v.minimumMonths==="number" && typeof v.declaredMonths==="number") return `Annonce : ${v.minimumMonths} mois ; profil : ${v.declaredMonths} mois d’expérience déclarée`;
 }
 return "";
}
export function ExternalCorrespondence({id,userId}:{id:string;userId:string}) {
 const r=useRemote(signal=>api<{profileCorrespondence:{criteria:Record<string,{status:string;reason:string;value?:unknown}>}}>("/me/listings/"+encodeURIComponent(id)+"/correspondence",{signal}),userId+":"+id);
 return <section className={s.card}><h2>Correspondance avec votre profil</h2><p>Comparaison partielle : les informations manquantes ne prouvent pas une correspondance. Aucun score global ni admissibilité garantie.</p>{r.loading?<p role="status">Comparaison en cours…</p>:r.error?<p role="alert">La comparaison est indisponible. <Button onClick={r.reload}>Réessayer</Button></p>:<dl className={s.details}>{Object.entries(r.data?.profileCorrespondence.criteria || {}).map(([key,c])=><div key={key}><dt>{labels[key] || "Condition professionnelle"}</dt><dd>{states[c.status] || "À vérifier"}{comparisonValue(c.value)&&<p>{comparisonValue(c.value)}</p>}{reasons[c.reason]&&<p>{reasons[c.reason]}</p>}</dd></div>)}</dl>}</section>;
}
