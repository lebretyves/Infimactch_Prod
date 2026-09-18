import {matchingScoreLabel, indicativeScoreNotice} from "@/lib/matchingScore";
import type { CandidateMatching } from "@/services/enterpriseApplications";
import { labelCode } from "@/data/professional";
import s from "./CandidateMatch.module.css";
const reasons: Record<string, string> = {
  SERVICE_NOT_PREFERRED: "Le service de cette mission ne fait pas partie des choix du candidat pour ce métier.",
  SCHEDULE_UNCONFIRMED: "Les horaires précis restent à confirmer.",
  QUALIFICATION_MISSING: "Le diplôme demandé n’est pas déclaré dans le profil.",
  RPPS_NOT_CHECKED: "Le numéro RPPS n’a pas encore été vérifié.",
  RPPS_PENDING: "La vérification du numéro RPPS est en attente.",
  RPPS_NOT_FOUND: "Le numéro RPPS n’a pas été retrouvé dans le répertoire.",
  REQUIRED_SKILLS_MISSING: "Certaines compétences requises ne sont pas déclarées.",
  EXPERIENCE_INSUFFICIENT: "L’expérience déclarée dans ce service est inférieure au minimum demandé.",
  NOT_FULLY_AVAILABLE: "Les disponibilités déclarées ne couvrent pas toute la vacation.",
  ASSIGNMENT_CONFLICT: "Une autre mission est déjà confirmée sur cette période.",
  SHIFT_NOT_ACCEPTED: "Ces horaires ne figurent pas parmi les horaires acceptés par le candidat.",
  MOBILITY_INCOMPLETE: "La position ou le rayon de mobilité du candidat est incomplet.",
  OUTSIDE_RADIUS: "L’établissement se trouve hors du rayon de mobilité déclaré.",
  MISSION_ALREADY_STARTED: "La mission a déjà commencé.",
  MISSION_NOT_OPEN: "La mission n’est plus ouverte.",
};
function duration(months: number) {
  if (!Number.isFinite(months)) return "À confirmer";
  months = Math.max(0, Math.floor(months));
  if (months < 12) return `${months} mois`;
  return `${Math.floor(months / 12)} an${months >= 24 ? "s" : ""}${months % 12 ? ` et ${months % 12} mois` : ""}`;
}
export function CandidateMatch({ matching: m, qualification, service }: { matching?: CandidateMatching | null; qualification: string; service?: string }) {
  if (!m) return <p className={s.unknown}>Comparaison du profil : à confirmer.</p>;
  const availabilityIssue = m.reasons.some(r => ["NOT_FULLY_AVAILABLE", "ASSIGNMENT_CONFLICT"].includes(r));
  const scheduleUnknown = m.reasons.includes("SCHEDULE_UNCONFIRMED");
  const availability = scheduleUnknown ? "Horaires à confirmer" : availabilityIssue ? "Écart à vérifier" : m.eligible ? "Vacation couverte" : "À confirmer";
  return <section className={s.match} aria-label="Comparaison du profil avec la mission">
    <div className={s.heading}><strong>Profil et mission</strong><span className={s.status} data-tone={m.eligible ? "ok" : "review"}>{m.eligible ? "Critères compatibles" : "Points à examiner"}</span><span className={s.score}>{matchingScoreLabel(m.score,m.indicativeScore)}</span></div>
    {m.score == null && m.indicativeScore != null && <p>{indicativeScoreNotice}</p>}
    <dl className={s.criteria}>
      <div><dt>Métier demandé</dt><dd>{qualification} · {m.qualificationMatches ? "déclaré" : "à confirmer"}</dd></div>
      <div><dt>RPPS</dt><dd>{m.rppsStatus === "FOUND" ? "Retrouvé dans le répertoire" : m.rppsStatus === "PENDING" ? "Vérification en attente" : "À confirmer"}</dd></div>
      <div><dt>Expérience{service ? ` · ${labelCode(service)}` : " dans le service"}</dt><dd>{duration(m.experienceMonths)} déclarés <span>Minimum demandé : {duration(m.requiredExperienceMonths)}</span></dd></div>
      <div><dt>Proximité</dt><dd>{m.distanceKm === null || !Number.isFinite(m.distanceKm) ? "À confirmer" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(m.distanceKm)} km`}<span>Rayon du candidat : {m.radiusKm === null ? "à confirmer" : `${m.radiusKm} km`}</span></dd></div>
      <div><dt>Disponibilités</dt><dd>{availability}</dd></div>
    </dl>
    {!!m.reasons.length && <div className={s.reasons}><strong>À examiner avant de confirmer</strong><ul>{[...new Set(m.reasons)].map(reason => <li key={reason}>{reasons[reason] || "Une condition de la mission reste à vérifier."}</li>)}</ul></div>}
    {(m.missingRequiredSkills.length > 0 || m.desiredSkills.length > 0) && <details className={s.skills}><summary>Compétences déclarées et attendues</summary>{m.missingRequiredSkills.length > 0 && <p>Requises non déclarées : {m.missingRequiredSkills.map(labelCode).join(", ")}.</p>}{m.desiredSkills.length > 0 && <p>Souhaitées retrouvées : {m.desiredSkillsMatched.length} sur {m.desiredSkills.length}{m.desiredSkillsMatched.length ? ` (${m.desiredSkillsMatched.map(labelCode).join(", ")})` : ""}.</p>}</details>}
  </section>;
}
