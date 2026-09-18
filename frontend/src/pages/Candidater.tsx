import {missionDate} from "@/services/market";
﻿import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { detail, apply, applicationCheck, salary, type ApplicationCheck, type Listing } from "@/services/market";
import { reasonLabels } from "@/services/messages";
import { labelCode } from "@/data/professional";
import { Button, ButtonLink } from "@/ui/Button";
import s from "./Candidater.module.css";
import { Icon } from "@/ui/Icon";
function warningText(code: string, check: ApplicationCheck | null, mission: Listing): string {
  switch (code) {
    case "REQUIRED_SKILLS_MISSING":
      return check?.missingSkills.length
        ? `Compétences demandées mais non renseignées dans votre profil : ${check.missingSkills.map(labelCode).join(", ")}.`
        : "Certaines compétences demandées ne sont pas renseignées dans votre profil.";
    case "EXPERIENCE_INSUFFICIENT":
      return check
        ? `Expérience en ${labelCode(mission.service || "ce service")} : ${(Math.floor(check.experienceMonths * 10) / 10).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} mois renseignés pour ${check.requiredExperienceMonths} mois demandés.`
        : "L’expérience renseignée est inférieure à celle demandée pour ce service.";
    case "SCHEDULE_UNCONFIRMED":
      return "Horaires précis à confirmer avec l’établissement : la disponibilité et les chevauchements ne peuvent pas être entièrement vérifiés avant cette confirmation.";
    case "NOT_FULLY_AVAILABLE":
      return `Vos disponibilités enregistrées ne couvrent pas toute la mission, du ${missionDate(mission)} au ${missionDate(mission, true)}.`;
    case "SHIFT_NOT_ACCEPTED":
      return `Les horaires de cette mission (${({ DAY: "jour", NIGHT: "nuit", MIXED: "jour et nuit" } as Record<string, string>)[mission.shift || ""] || "voir les conditions"}) ne figurent pas parmi vos horaires acceptés.`;
    case "OUTSIDE_RADIUS":
      return check?.distanceKm != null
        ? `Cette mission se trouve à environ ${Math.round(check.distanceKm)} km de votre position de référence, au-delà de votre rayon de mobilité.`
        : "Cette mission est située hors de votre rayon de mobilité.";
    case "MOBILITY_INCOMPLETE":
      return "La distance ne peut pas être vérifiée : la position ou le rayon de mobilité manque dans le profil, ou le lieu de mission est incomplet.";
    default:
      return reasonLabels[code] || "Un critère de votre profil diffère des conditions demandées.";
  }
}
export default function Candidater() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const r = useRemote((signal) => detail(id, signal), id);
  const check = useRemote(
    async (signal) => user?.role === "interimaire" && id.startsWith("m_")
      ? applicationCheck(id, signal) : null,
    "application-check:" + user?.id + ":" + id + ":" + r.data?.version,
  );
  const [sentWarnings, setSentWarnings] = useState<string[]>([]);
  const key = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    key.current = crypto.randomUUID();
    setConsent(false);
    setSent(false);
    setSentWarnings([]);
    setError("");
  }, [id, r.data?.version]);
  async function send() {
    if (!r.data || busy || !consent) return;
    setBusy(true);
    setError("");
    try {
      const result = await apply(r.data, key.current);
      setSentWarnings(result.warnings || []);
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (r.loading) return <p role="status">Chargement...</p>;
  if (r.error || !r.data)
    return (
      <div className={s.page} role="alert">
        <h1>Mission indisponible</h1>
        <p>{r.error || "Mission introuvable."}</p>
        <Button onClick={r.reload}>Réessayer</Button>
        <ButtonLink to="/missions">Retour aux missions</ButtonLink>
      </div>
    );
  if (sent)
    return (
      <div className={s.success}>
        <Icon name="file-text" size={36} />
        <h1>Candidature enregistrée</h1>
        <p>
          Votre candidature a bien été enregistrée. Vous pouvez suivre son
          évolution dans votre espace.
        </p>
        {sentWarnings.length > 0 && <section className={s.warning} aria-label="Écarts signalés">
          <h2>Candidature envoyée malgré les écarts</h2>
          <ul>{sentWarnings.map(code => <li key={code}>{warningText(code, check.data, r.data!)}</li>)}</ul>
          <p>Votre candidature reste soumise à l’examen de l’agence ou de l’établissement.</p>
        </section>}
        <ButtonLink to="/candidatures">Suivre ma candidature</ButtonLink>
      </div>
    );
  const m = r.data;
  if (
    id.startsWith("e_") ||
    user?.role !== "interimaire" ||
    m.status !== "OPEN"
  )
    return (
      <div className={s.page}>
        <p>La candidature directe n’est pas disponible.</p>
        <ButtonLink to={"/missions/" + id}>Voir l’annonce</ButtonLink>
      </div>
    );
  return (
    <div className={s.page}>
      <h1 className={s.titre}>Postuler à cette mission</h1>
      <section className={s.rappel}>
        <h2>{m.title}</h2>
        <p>
          {missionDate(m)} → {missionDate(m, true)}
        </p>
        <p>{salary(m)}</p>
        <p>{m.address}</p>
      </section>
      <div className={s.reviewColumns}>
      <section className={s.bloc}>
        <h2>Conditions de la mission</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{m.description}</p>
        <p>
          Qualification : {m.qualification} · Service :{" "}
          {m.service ? labelCode(m.service) : "Non précisé"}
        </p>
        <p>
          Compétences requises :{" "}
          {(m.required_skills || []).map(labelCode).join(", ") ||
            "Aucune compétence supplémentaire indiquée"}
        </p>
        <p>Expérience minimale : {m.min_experience_months ?? 0} mois</p>
      </section>
      <section className={s.bloc}>
        <h2>Profil utilisé</h2>
        <p>
          {user.prenom} {user.nom}
        </p>
        <p>{user.qualification || "Qualification à renseigner"}</p>
        <p>
          Les écarts de compétences, d’expérience, de disponibilités ou de mobilité
          vous sont signalés. Vous pouvez envoyer votre candidature malgré ces écarts.
          L’agence ou l’établissement examine ensuite votre candidature.
        </p>
        <ButtonLink to="/profil" variant="ghost">
          Vérifier mon profil
        </ButtonLink>
        <ButtonLink to="/dossier" variant="ghost">
          Mon dossier professionnel
        </ButtonLink>
      </section>
      </div>
      {check.loading && <p role="status">Vérification des critères de la mission…</p>}
      {check.error && <p className={s.warning} role="status">Le détail des écarts est temporairement indisponible. Vous pouvez envoyer votre candidature ; les critères seront revérifiés à l’envoi.</p>}
      {!!check.data?.warnings.length && <section className={s.warning} role="status" aria-labelledby="application-warning-title">
        <h2 id="application-warning-title">Attention, certains critères diffèrent</h2>
        <ul>{check.data.warnings.map(code => <li key={code}>{warningText(code, check.data, m)}</li>)}</ul>
        <p>Ces écarts n’empêchent pas l’envoi de votre candidature. L’agence ou l’établissement évaluera votre profil.</p>
      </section>}
      {!!check.data?.blockingReasons.length && <section role="alert">
        <h2>Points à régulariser avant l’envoi</h2>
        <ul>{check.data.blockingReasons.map(code => <li key={code}>{reasonLabels[code] || "Cette candidature ne peut pas encore être envoyée."}</li>)}</ul>
      </section>}
      <label>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />{" "}
        J’ai consulté les conditions actuelles de la mission et confirme ma
        candidature.
      </label>
      {error && <p role="alert">{error}</p>}
      <div className={s.actions}>
        <ButtonLink to={"/missions/" + id} variant="ghost">
          Retour
        </ButtonLink>
        <Button disabled={!consent || busy || check.loading || !!check.data?.blockingReasons.length} loading={busy} onClick={send}>
          {check.data?.warnings.length ? "Envoyer quand même ma candidature" : "Confirmer ma candidature"}
        </Button>
      </div>
    </div>
  );
}
