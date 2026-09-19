import { useParams } from "react-router";
import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { date, statusLabels } from "@/services/market";
import { Button, ButtonLink } from "@/ui/Button";
import { ConfirmationButton } from "@/components/ConfirmationButton";
import s from "./MarketPages.module.css";
type Application = {
  id: string;
  mission_id: string;
  title: string;
  status: string;
  requires_reconsent: boolean;
  assignments: { id: string; status: string }[];
  events: { event: string; created_at: string }[];
};
const events: Record<string, string> = {
  APPLICATION_UNAVAILABLE: "Candidature fermée automatiquement : autre mission confirmée sur ce créneau",
  APPLICATION_SUBMITTED: "Candidature envoyée ou reconfirmée",
  APPLICATION_SELECTED: "Candidature sélectionnée par l’établissement",
  APPLICATION_REJECTED: "Candidature refusée",
  APPLICATION_WITHDRAWN: "Candidature retirée",
  ASSIGNMENT_CREATED: "Affectation confirmée par l’agence",
  ASSIGNMENT_CANCELLED: "Affectation annulée",
  MISSION_COMPLETED: "Mission terminée",
};
export default function CandidatureDetail() {
  const { id = "" } = useParams(),
    { user } = useAuth();
  const r = useRemote(
    (signal) => api<Application>("/applications/" + id, { signal }),
    id,
  );
  return (
    <div className={s.page}>
      <div>
        <ButtonLink
          to={user?.role === "interimaire" ? "/candidatures" : "/missions"}
          variant="ghost"
        >
          ← Retour aux candidatures
        </ButtonLink>
      </div>
      <header className={s.header}>
        <div>
          <p className={s.eyebrow}>Mes candidatures</p>
          <h1>Suivi de candidature</h1>
          <p className={s.subtitle}>
            Les étapes et les confirmations de votre candidature.
          </p>
        </div>
      </header>
      {r.loading ? (
        <div className={s.empty} role="status">
          Chargement du suivi…
        </div>
      ) : r.error ? (
        <div className={s.empty} role="alert">
          <p>{r.error}</p>
          <Button onClick={r.reload}>Réessayer</Button>
        </div>
      ) : (
        r.data && (
          <div className={s.columns}>
            <section className={s.card}>
              <h2>{r.data.title}</h2>
              <span
                className={s.badge}
                data-tone={r.data.status === "SELECTED" ? "warning" : undefined}
              >
                {statusLabels[r.data.status] || "État à vérifier"}
              </span>
              {r.data.status === "SELECTED" &&
                !r.data.assignments.some((a) => a.status === "ACTIVE") && (
                  <p className={s.notice}>
                    Votre candidature a été retenue. La mission sera confirmée
                    après validation de l’affectation par l’agence.
                  </p>
                )}
              {r.data.requires_reconsent && ["SUBMITTED","SELECTED"].includes(r.data.status) && (
                <div className={s.notice}>
                  <p>Les conditions de la mission ont changé.</p>
                  {user?.role === "interimaire" && (
                    <ButtonLink
                      to={"/missions/m_" + r.data.mission_id + "/candidater"}
                    >
                      Lire et confirmer les nouvelles conditions
                    </ButtonLink>
                  )}
                </div>
              )}
              <h2 style={{ marginTop: 28 }}>Historique de la candidature</h2>
              {r.data.events.length ? (
                <ol className={s.timeline}>
                  {r.data.events.map((e, i) => (
                    <li key={i}>
                      <time dateTime={e.created_at}>{date(e.created_at)}</time>
                      <strong>
                        {events[e.event] || "Mise à jour de la candidature"}
                      </strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={s.muted}>
                  Aucun événement détaillé n’est disponible.
                </p>
              )}
            </section>
            <aside className={s.stack}>
              {r.data.assignments.map((a) => (
                <section className={s.card} key={a.id}>
                  <h2>
                    {a.status === "ACTIVE"
                      ? "Mission confirmée"
                      : "Affectation " +
                        (statusLabels[a.status] || "à vérifier").toLowerCase()}
                  </h2>
                  <p className={s.muted}>
                    Consultez la confirmation et ses conditions enregistrées.
                  </p>
                  <ConfirmationButton assignmentId={a.id} cancelled={a.status === "CANCELLED"} />
                </section>
              ))}
              <div className={s.card}>
                <h2>La mission</h2>
                <p className={s.muted}>
                  Retrouvez le descriptif et les informations de
                  l’établissement.
                </p>
                <ButtonLink
                  to={
                    user?.role === "interimaire"
                      ? "/missions/m_" + r.data.mission_id
                      : "/gestion/missions/" + r.data.mission_id
                  }
                  variant="outline"
                >
                  Voir la mission
                </ButtonLink>
              </div>
            </aside>
          </div>
        )
      )}
    </div>
  );
}
