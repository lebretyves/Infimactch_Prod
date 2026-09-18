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
    <p>Les services souhaités sont enregistrés séparément pour chaque métier. Plusieurs services cochés sont des alternatives ; aucun choix ne restreint le service. Une mission hors de ces préférences n’est pas proposée par le matching automatique, mais une candidature volontaire reste possible si les autres conditions le permettent.</p>
    <p>Le moteur vérifie d’abord le métier, le RPPS, les compétences requises, l’expérience minimale, les disponibilités, l’absence de conflit, les horaires acceptés et le rayon de mobilité. Les horaires doivent être confirmés et la mission ouverte.</p>
    <p>Si une condition manque, le taux reste non calculable et les points à vérifier sont indiqués. Un taux absent ne signifie pas 0 %.</p>
    {r.loading ? <p role="status">Chargement des pondérations…</p> : r.error ? <p role="alert">Pondérations indisponibles. <button type="button" onClick={r.reload}>Réessayer</button></p> : r.data && <ul>
      <li>Compétences souhaitées : {r.data.weights.C * 100} % du score, selon la proportion déclarée ; totalité des points si aucune n’est demandée.</li>
      <li>Proximité : {r.data.weights.Z * 100} %, diminue avec la distance jusqu’à la limite du rayon déclaré.</li>
      <li>Horaires préférés : {r.data.weights.D * 100} %, moitié des points si les horaires sont acceptés mais non préférés ; totalité sans préférence déclarée.</li>
      <li>Expérience dans le service : {r.data.weights.E * 100} %, progresse jusqu’à 24 mois puis reste au maximum.</li>
    </ul>}
    <p>Le pourcentage est un indice de correspondance, pas une probabilité de recrutement ni une affectation automatique. Les offres externes disposent d’une comparaison partielle, sans taux global fiable.</p>
  </details><MatchingReminder enterprise={user?.role !== "interimaire"} /></div>;
}
