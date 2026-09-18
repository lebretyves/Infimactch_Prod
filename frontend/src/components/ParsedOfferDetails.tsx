import {sourceOfferFields,remainingSourcePassages,offerSourceGroups} from '@/lib/parsedOfferSource';
import type {ParsedOffer} from "@/services/parsed-offer";
import s from "./ParsedOfferPreview.module.css";
const states: Record<string,string>={REPORTED:"Indiqué dans l’annonce",MENTION:"Mentionné — contexte à vérifier",DESIRED:"Souhaité dans le texte",REQUIRED:"Exigé dans le texte",NEGATED:"Négation dans le texte",REVIEW_REQUIRED:"À confirmer"};
const warnings: Record<string,string>={MULTIPLE_SERVICES_MENTIONNES:"Plusieurs services sont cités : vérifier le service d’affectation et le contexte de chaque mention.",TEMPS_PLEIN_PARTIEL_CONTRADICTOIRE:"L’annonce mentionne à la fois temps plein et temps partiel.",CONTRAT_IMPORT_TEXTE_DIVERGENT:"Le contrat importé et le texte de l’annonce divergent.",EXPERIENCE_API_TEXTE_DIVERGENTE:"La durée d’expérience diffère entre le texte et les données du fournisseur.",DATES_FOURNISSEUR_A_COMPLETER:"Les dates sont incomplètes dans le texte source.",IBODE_TITRE_MAIS_DIPLOME_SOUHAITE_DANS_TEXTE:"Le titre IBODE et le niveau d’exigence du diplôme sont à vérifier.",HORAIRES_API_TEXTE_A_RECONCILIER:"Les horaires du texte et du fournisseur sont à rapprocher.",DESCRIPTION_DEGRADEE:"La description contient des passages dégradés."};
export function ParsedOfferDetails({offer}:{offer:ParsedOffer}) {
 const sourceFields=sourceOfferFields(offer.fields),reviewQueue=remainingSourcePassages(offer.reviewQueue,sourceFields);
 return <section className={s.panel} aria-label="Informations extraites de l’annonce">
  <header className={s.heading}><h2>L’essentiel de l’annonce</h2><span>Informations repérées automatiquement dans le texte. Les extraits permettent de vérifier leur contexte ; une information non extraite reste à consulter dans l’annonce originale.</span></header>
  {!!offer.warnings.length && <div className={s.alert}><h3>Points à vérifier</h3><ul>{offer.warnings.map(w=><li key={w}>{warnings[w] || "Une incohérence dans l’annonce nécessite une relecture."}</li>)}</ul></div>}
  {offerSourceGroups.map(group=>{
   const fields=sourceFields.filter(f=>f.category===group.id);
   if(!fields.length)return null;
   return <section className={s.group} key={group.title}><h3>{group.title}</h3>{fields.length?<dl>{fields.map((f,i)=><div className={s.field} key={f.key+":"+i}><dt>{f.label}</dt><dd><strong style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{f.evidence.text}</strong><span className={s.status} data-status={f.state==="REVIEW_REQUIRED"?"uncertain":f.state==="DESIRED"?"desired":undefined}>{states[f.state] || "À vérifier"}</span></dd></div>)}</dl>:<p className={s.note}>Aucune information structurée disponible dans cette rubrique. Consulter le texte original.</p>}</section>;
  })}
  {!!reviewQueue.length && <details className={s.group}><summary>Passages à relire ({reviewQueue.length})</summary><p className={s.note}>Ces passages peuvent contenir des informations partiellement classées ou non extraites.</p>{reviewQueue.map((t,i)=><blockquote key={i} style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{t}</blockquote>)}</details>}
 </section>;
}
