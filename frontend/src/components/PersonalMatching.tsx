import { Link } from "react-router";
import {matchingScoreLabel, indicativeScoreNotice} from "@/lib/matchingScore";
import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import { reasonLabels } from "@/services/messages";
import { MatchingRules } from "./MatchingRules";
export function PersonalMatching({id, userId}: {id: string; userId: string}) {
  const r = useRemote(signal => api<{score: number | null; indicativeScore?:number|null; reasons: string[]}>("/me/matches/mission/" + encodeURIComponent(id.slice(2)), {signal}), userId + ":matching:" + id);
  return <section aria-label="Votre taux de matching">
    <h2>Votre matching avec cette mission</h2>
    {r.loading ? <p role="status">Calcul du taux…</p> : r.error ? <p role="alert">Le taux est indisponible. <button type="button" onClick={r.reload}>Réessayer</button></p> : r.data && <>
      <p aria-live="polite"><strong>{matchingScoreLabel(r.data.score,r.data.indicativeScore)}</strong></p>
      {r.data.score == null && r.data.indicativeScore != null && <p>{indicativeScoreNotice}</p>}
      {!!r.data.reasons.length && <ul>{r.data.reasons.map(reason => <li key={reason}>{reasonLabels[reason] || "Une condition reste à vérifier."}</li>)}</ul>}
      {r.data.reasons.some(reason => reason.startsWith("RPPS_")) && <Link to="/dossier#verification">Vérifier mon numéro RPPS</Link>}
    </>}
    <MatchingRules />
  </section>;
}
