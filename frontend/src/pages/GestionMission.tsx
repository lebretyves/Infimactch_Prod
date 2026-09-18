import { MatchingRules } from "@/components/MatchingRules";
import { missionReturnTo } from "@/lib/missionNavigation";
import { CandidateMatch } from "@/components/CandidateMatch";
import type { CandidateMatching } from "@/services/enterpriseApplications";
import {missionDate} from "@/services/market";
import { useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import { date, statusLabels, type Listing } from "@/services/market";
import { explainReasons } from "@/services/messages";
import { labelCode } from "@/data/professional";
import { Button, ButtonLink } from "@/ui/Button";
import { ConfirmationButton } from "@/components/ConfirmationButton";
import page from "./Candidater.module.css";
import s from "./inscription/Etape.module.css";
type Candidate = {
  matching?: CandidateMatching | null;
  id: string;
  nurse_id: string;
  status: string;
  display_name: string;
  qualifications: string[];
  skills: string[];
  rpps_status: string;
  experience: { service: string; start: string; end: string }[];
  available: { start: string; end: string }[];
  city?: string;
  radius_km?: number;
};
type Mission = Listing & {
  id: string;
  agency_id: string | null;
  can_manage: boolean;
  staffing_request_id?: string | null;
  events: {event:string;created_at:string}[];
  end_at: string;
  assignments: { id: string; status: string; display_name: string }[];
  application_count: number;
};
export default function GestionMission() {
  const [params] = useSearchParams();
  const returnTo = missionReturnTo(params.get("returnTo"));
  const { id = "" } = useParams(),
    { user } = useAuth();
  const [offset, setOffset] = useState(0),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const keys = useRef(new Map<string, string>());
  const r = useRemote(
    async (signal) => {
      const [mission, candidates] = await Promise.all([
        api<Mission>("/missions/" + id, { signal }),
        api<Candidate[]>(
          "/missions/" + id + "/applications?limit=20&offset=" + offset,
          { signal },
        ),
      ]);
      return { mission, candidates };
    },
    id + ":" + offset,
  );
  const [proposedPage, setProposedPage] = useState({id, offset:0});
  const proposedOffset = proposedPage.id === id ? proposedPage.offset : 0;
  const proposed = useRemote(
    (signal) =>
      api<{
        total: number;
        items: {
          candidateId: string;
          display_name?: string;
          score: number;
          qualifications: string[];
          skills: string[];
          reasons: string[];
        }[];
      }>("/missions/" + id + "/candidates?limit=20&offset=" + proposedOffset, { signal }),
    user?.id + ":" + id + ":" + proposedOffset,
  );
  async function action(path: string, body?: unknown) {
    if (busy) return;
    const operation = path + JSON.stringify(body || {});
    if (!keys.current.has(operation))
      keys.current.set(operation, crypto.randomUUID());
    setBusy(path);
    setError("");
    setMessage("");
    try {
      await api(path, {
        method: "POST",
        body,
        key: keys.current.get(operation),
      });
      keys.current.delete(operation);
      setMessage("Action enregistrée.");
      r.reload();
      proposed.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (r.loading) return <p role="status">Chargement…</p>;
  if (r.error || !r.data)
    return (
      <div role="alert">
        {r.error}
        <Button onClick={r.reload}>Réessayer</Button>
        <ButtonLink to={returnTo}>Retour</ButtonLink>
      </div>
    );
  const m = r.data.mission,
    agency = m.can_manage;
  return (
    <div className={page.page}>
      <MatchingRules />
      <ButtonLink to={returnTo} variant="ghost">
        Retour aux missions
      </ButtonLink>
      <h1>{m.title}</h1>
      <p>
        {statusLabels[m.status || ""] || "État à vérifier"} · {missionDate(m)}{" "}
        → {missionDate(m, true)}
      </p>
      <p>{m.status === "DRAFT" ? "Brouillon : cette offre n’est pas encore visible aux intérimaires. Complétez-la puis publiez-la." : m.status === "OPEN" ? "Offre publiée : les intérimaires peuvent la consulter et candidater selon leurs critères." : "Cette offre n’est plus ouverte aux nouvelles candidatures."}</p>
      {m.staffing_request_id && <ButtonLink to={"/besoins#besoin-"+m.staffing_request_id} variant="outline">Voir le besoin d’origine</ButtonLink>}
      <p>{m.application_count} candidature(s) reçue(s) · {m.assignments.filter(a=>a.status==='ACTIVE').length} affectation(s) confirmée(s)</p>
      {m.assignments.map((a) => (
        <section key={a.id} className={s.bloc}>
          <h2>Confirmation de mission</h2>
          <p>{a.display_name} — {statusLabels[a.status] || a.status}</p>
          <ConfirmationButton assignmentId={a.id} />
        </section>
      ))}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!!m.events?.length && <section className={s.bloc}><h2>Suivi de l’offre</h2><ul>{m.events.map((e,index)=><li key={index}>{({MISSION_CREATED:"Mission créée",MISSION_OPEN:"Offre publiée",MISSION_REVISED:"Conditions modifiées",MISSION_CANCELLED:"Offre annulée",MISSION_COMPLETED:"Mission terminée",MISSION_DRAFT:"Retour en brouillon"} as Record<string,string>)[e.event] || "Mise à jour de la mission"} · {date(e.created_at)}</li>)}</ul></section>}
      {agency && (
        <section className={s.bloc}>
          <h2>Gestion de la mission</h2>
          {["DRAFT", "OPEN"].includes(m.status || "") && (
            <ButtonLink
              to={"/gestion/missions/" + id + "/modifier?" + new URLSearchParams({ returnTo })}
              variant="outline"
            >
              Modifier la mission
            </ButtonLink>
          )}
          {m.status === "DRAFT" && (
            <Button
              disabled={!!busy}
              onClick={() => void action("/missions/" + id + "/publish")}
            >
              Publier la mission
            </Button>
          )}
          {["DRAFT", "OPEN", "FILLED"].includes(m.status || "") && (
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Annuler cette mission ? Les affectations concernées seront annulées.",
                  )
                )
                  void action("/missions/" + id + "/cancel");
              }}
            >
              Annuler la mission
            </Button>
          )}
          {m.status === "CANCELLED" && (
            <Button
              disabled={!!busy}
              onClick={() => void action("/missions/" + id + "/reopen")}
            >
              Rouvrir en brouillon
            </Button>
          )}
          {m.status === "FILLED" && (
            <Button
              disabled={!!busy || Date.parse(m.end_at) > Date.now()}
              onClick={() => void action("/missions/" + id + "/complete")}
            >
              Terminer la mission
            </Button>
          )}
        </section>
      )}
      <section className={s.bloc} id="candidatures">
        <h2>Candidatures reçues ({m.application_count})</h2>
        {!r.data.candidates.length && <p>Aucune candidature sur cette page.</p>}
        {r.data.candidates.map((c) => (
          <article key={c.id} className={s.bloc}>
            <h3>{c.display_name || "Professionnel de santé"}</h3>
            <p>
              {c.qualifications.join(", ")} ·{" "}
              {statusLabels[c.status] || "État à vérifier"}
            </p>
            <p>
              {c.city || "Ville non renseignée"} · Rayon :{" "}
              {c.radius_km ?? "non renseigné"} km
            </p>
            <p>
              Compétences :{" "}
              {c.skills.map(labelCode).join(", ") || "À compléter"}
            </p>
            <CandidateMatch matching={c.matching} qualification={m.qualification} service={m.service} />
            <details>
              <summary>Parcours et disponibilités</summary>
              {c.experience.map((e, i) => (
                <p key={i}>
                  {labelCode(e.service)} : {date(e.start)} → {date(e.end)}
                </p>
              ))}
              {c.available.map((e, i) => (
                <p key={i}>
                  Disponible : {date(e.start)} → {date(e.end)}
                </p>
              ))}
            </details>
            <ButtonLink to={"/candidatures/" + c.id} variant="ghost">
              Voir le suivi
            </ButtonLink>
            {!agency &&
              m.status === "OPEN" &&
              ["SUBMITTED", "SELECTED"].includes(c.status) && (
                <>
                  {c.status === "SUBMITTED" && (
                    <Button
                      disabled={!!busy}
                      onClick={() =>
                        void action("/applications/" + c.id + "/selection")
                      }
                    >
                      Sélectionner ce candidat
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    disabled={!!busy}
                    onClick={() =>
                      void action("/applications/" + c.id + "/rejection")
                    }
                  >
                    Refuser cette candidature
                  </Button>
                </>
              )}
            {agency &&
              m.status === "OPEN" &&
              ["SUBMITTED", "SELECTED"].includes(c.status) && (
                <>
                  <p>
                    Les informations de profil incomplètes restent des avertissements.
                    En confirmant, vous validez avec le candidat ses compétences et sa
                    disponibilité. La mission sera ajoutée en bleu à son agenda et
                    bloquera le créneau. Une autre mission déjà confirmée sur ce
                    créneau empêche l’affectation.
                  </p>
                  <Button
                    disabled={!!busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Avez-vous vérifié avec le candidat ses compétences et sa disponibilité ? Confirmer l’affectation ajoutera la mission à son agenda et bloquera ce créneau.",
                        )
                      )
                        void action("/missions/" + id + "/assignments", {
                          applicationId: c.id,
                        });
                    }}
                  >
                    Confirmer l’affectation
                  </Button>
                </>
              )}
          </article>
        ))}
        <Button
          variant="ghost"
          disabled={!offset}
          onClick={() => setOffset((v) => Math.max(0, v - 20))}
        >
          Précédent
        </Button>
        <Button
          variant="ghost"
          disabled={r.data.candidates.length < 20}
          onClick={() => setOffset((v) => v + 20)}
        >
          Suivant
        </Button>
      </section>
      {agency && m.status === "OPEN" && (
        <section className={s.bloc}>
          <h2>Profils proposés</h2>
          {proposed.loading ? (
            <p>Recherche en cours…</p>
          ) : proposed.error ? (
            <p role="alert">
              Les propositions ne sont pas disponibles.{" "}
              <Button onClick={proposed.reload}>Réessayer</Button>
            </p>
          ) : (
            <>
              {proposed.data?.items.map((c, i) => (
                <div key={c.candidateId}>
                  <h3>{c.display_name || "Profil proposé " + (i + 1)}</h3>
                  <p>
                    {c.qualifications.join(", ")} ·{" "}
                    <strong>Taux de matching : {Math.round(c.score)} %</strong>
                  </p>
                  <p>{c.skills.map(labelCode).join(", ")}</p>
                  {c.reasons.length > 0 && <p>{explainReasons(c.reasons)}</p>}
                </div>
              ))}
              {!proposed.data?.items.length && (
                <p>Aucun profil admissible proposé pour le moment.</p>
              )}
              <nav aria-label="Pages des profils proposés">
                <Button variant="ghost" disabled={proposed.loading || proposedOffset===0} onClick={()=>setProposedPage({id,offset:Math.max(0,proposedOffset-20)})}>Profils précédents</Button>
                <span role="status">Page {Math.floor(proposedOffset/20)+1} sur {Math.max(1,Math.ceil((proposed.data?.total || 0)/20))} · {proposed.data?.total || 0} profils</span>
                <Button variant="ghost" disabled={proposed.loading || proposedOffset+20 >= (proposed.data?.total || 0)} onClick={()=>setProposedPage({id,offset:proposedOffset+20})}>Profils suivants</Button>
              </nav>
              <p>
                Une candidature et le consentement du professionnel sont
                nécessaires avant l’affectation.
              </p>
            </>
          )}
        </section>
      )}

    </div>
  );
}
