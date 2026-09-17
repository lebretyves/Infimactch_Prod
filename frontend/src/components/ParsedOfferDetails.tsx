import type {ParsedOffer} from "@/services/parsed-offer";
import s from "./ParsedOfferPreview.module.css";
const states: Record<string,string>={REPORTED:"Indiqué dans l’annonce",MENTION:"Mentionné — contexte à vérifier",DESIRED:"Souhaité dans le texte",REQUIRED:"Exigé dans le texte",NEGATED:"Négation dans le texte",REVIEW_REQUIRED:"À confirmer"};
const warnings: Record<string,string>={MULTIPLE_SERVICES_MENTIONNES:"Plusieurs services sont cités : vérifier le service d’affectation et le contexte de chaque mention.",TEMPS_PLEIN_PARTIEL_CONTRADICTOIRE:"L’annonce mentionne à la fois temps plein et temps partiel.",CONTRAT_IMPORT_TEXTE_DIVERGENT:"Le contrat importé et le texte de l’annonce divergent.",EXPERIENCE_API_TEXTE_DIVERGENTE:"La durée d’expérience diffère entre le texte et les données du fournisseur.",DATES_FOURNISSEUR_A_COMPLETER:"Les dates sont incomplètes dans le texte source.",IBODE_TITRE_MAIS_DIPLOME_SOUHAITE_DANS_TEXTE:"Le titre IBODE et le niveau d’exigence du diplôme sont à vérifier.",HORAIRES_API_TEXTE_A_RECONCILIER:"Les horaires du texte et du fournisseur sont à rapprocher.",DESCRIPTION_DEGRADEE:"La description contient des passages dégradés."};
const groups = [
 {title:"Poste et environnement",test:/qualification_titre|^service$|specialite|population|equipement|mode_exercice|charge_et_equipe|contexte|activite_transport/},
 {title:"Profil et compétences",test:/competence|certification|experience|langue|alternatives_professionnelles|debutant|permis|logiciel/},
 {title:"Organisation et horaires",test:/contrat|temps_travail|quotite|horaire|alternance|duree|pause|roulement|jours_|periode|dates_|debut_mission|planning|disponibilite|garde/},
 {title:"Rémunération et avantages",test:/remuneration|salaire|avantage|acompte|mobilite/},
];
export function ParsedOfferDetails({offer}:{offer:ParsedOffer}) {
 return <section className={s.panel} aria-label="Informations extraites de l’annonce">
  <header className={s.heading}><h2>L’essentiel de l’annonce</h2><span>Informations repérées automatiquement dans le texte. Les extraits permettent de vérifier leur contexte ; une information non extraite reste à consulter dans l’annonce originale.</span></header>
  {!!offer.warnings.length && <div className={s.alert}><h3>Points à vérifier</h3><ul>{offer.warnings.map(w=><li key={w}>{warnings[w] || "Une incohérence dans l’annonce nécessite une relecture."}</li>)}</ul></div>}
  {[...groups,{title:"Autres informations",test:null}].map(group=>{
   const fields=offer.fields.filter(f=>group.test?group.test.test(f.key):!groups.some(g=>g.test.test(f.key)));
   return <section className={s.group} key={group.title}><h3>{group.title}</h3>{fields.length?<dl>{fields.map((f,i)=><div className={s.field} key={f.key+":"+i}><dt>{f.label}</dt><dd><strong>{f.display}</strong><span className={s.status} data-status={f.state==="REVIEW_REQUIRED"?"uncertain":f.state==="DESIRED"?"desired":undefined}>{states[f.state] || "À vérifier"}</span><details><summary>Voir l’extrait source</summary><blockquote>{f.evidence.text}</blockquote></details></dd></div>)}</dl>:<p className={s.note}>Aucune information structurée disponible dans cette rubrique. Consulter le texte original.</p>}</section>;
  })}
  {!!offer.reviewQueue.length && <details className={s.group}><summary>Passages à relire ({offer.reviewQueue.length})</summary><p className={s.note}>Ces passages peuvent contenir des informations partiellement classées ou non extraites.</p>{offer.reviewQueue.map((t,i)=><blockquote key={i} style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{t}</blockquote>)}</details>}
 </section>;
}
