import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { MatchingReminder } from "./MatchingReminder";
export function MatchingRules() {
  const { user } = useAuth();
  const r = useRemote(signal => api<{weights: Record<"C" | "Z" | "D" | "E", number>}>("/matching/rules", {signal}), "matching-rules");
  return <div><details style={{border: "1px solid var(--line)", borderRadius: 12, padding: 16, marginBlock: 16}}>
    <summary style={{cursor: "pointer", fontWeight: 600}}>Comprendre les règles du matching</summary>
    <p>Le taux compare une personne et une mission. Les mêmes règles s’appliquent aux intérimaires et aux entreprises.</p>
    <p>Les services souhaités sont enregistrés séparément pour chaque métier. Plusieurs services cochés sont des alternatives ; sans service coché, tous les services de ce métier restent possibles. Une mission hors de ces préférences n’est pas proposée par le matching automatique, mais une candidature volontaire reste possible si les autres conditions le permettent.</p>
    <p>Pour proposer automatiquement une mission, le moteur vérifie le métier, le RPPS, les compétences requises, l’expérience minimale, les disponibilités, l’absence de conflit, les horaires acceptés et le rayon de mobilité. Les horaires doivent être confirmés et la mission ouverte.</p>
    <p>Si une condition manque, un taux indicatif reste affiché pour la comparaison manuelle, accompagné des points à vérifier. Il ne rend pas le candidat admissible au matching automatique. Une proximité ou des horaires impossibles à évaluer apportent 0 point, sans redistribuer leur poids.</p>
    {r.loading ? <p role="status">Chargement des pondérations…</p> : r.error ? <p role="alert">Pondérations indisponibles. <button type="button" onClick={r.reload}>Réessayer</button></p> : r.data && <ul>
      <li>Compétences souhaitées : {r.data.weights.C * 100} % du score, selon la proportion déclarée ; totalité des points si aucune n’est demandée.</li>
      <li>Proximité : {r.data.weights.Z * 100} %, diminue avec la distance jusqu’à la limite du rayon déclaré.</li>
      <li>Horaires préférés : {r.data.weights.D * 100} %, moitié des points si les horaires sont acceptés mais non préférés ; totalité sans préférence déclarée.</li>
      <li>Expérience dans le service : {r.data.weights.E * 100} %, progresse jusqu’à 24 mois puis reste au maximum.</li>
    </ul>}
    <p><strong>Confirmation par le recruteur :</strong> les disponibilités déclarées, compétences, expérience et préférences incomplètes sont des points à examiner. Elles ne bloquent pas, à elles seules, la confirmation d’une candidature volontaire. La qualification requise, le RPPS, les horaires confirmés, l’absence de chevauchement avec une affectation et l’état de la mission restent contrôlés.</p>
    <p><strong>Recherche et alertes :</strong> la ville et le rayon de recherche filtrent cette liste. Le matching et les alertes de missions compatibles utilisent la position et le rayon de mobilité enregistrés dans le profil. Changer la recherche ne change pas ces réglages.</p>
    <p>Le pourcentage est un indice de correspondance, pas une probabilité de recrutement ni une affectation automatique. Les offres externes disposent d’une comparaison partielle, sans taux global fiable.</p>
  </details><MatchingReminder enterprise={user?.role !== "interimaire"} /></div>;
}
