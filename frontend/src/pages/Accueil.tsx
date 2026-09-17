import { BankReminder } from "@/components/BankReminder";
import { MixedRecommendations } from "@/components/MixedRecommendations";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import { getProfile } from "@/services/profile";
import { allHistory, allPages } from "@/services/nurse";
import {
  date,
  favorite,
  favorites,
  type Application,
  type Listing,
} from "@/services/market";
import { periodLabel } from "@/lib/datePeriods";
import { Button, ButtonLink } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { ConfirmationButton } from "@/components/ConfirmationButton";
import u from "@/components/NurseUI.module.css";
import s from "./Accueil.module.css";
type Dashboard = { family: string; counts: Record<string, number | string>; activity?:{needs:number;applications:number}; recentNeeds?:{id:string;title:string;created_at:string;mission_count:number}[]; recentMissions?:{id:string;title:string;status:string;start_at:string;end_at:string;application_count:number}[] };
type Notification = {
  id: string;
  title?: string;
  message?: string;
  kind?: string;
  href?: string;
  read_at: string | null;
};
const labels: Record<string, string> = {
  DRAFT: "Brouillons",
  OPEN: "Missions ouvertes",
  FILLED: "Missions pourvues",
  COMPLETED: "Missions terminées",
  CANCELLED: "Missions annulées",
};
export default function Accueil() {
  const { user } = useAuth();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const nurse = user?.role === "interimaire";
  const r = useRemote(async (signal) => {
    const [dashboard, notifications] = await Promise.all([
      api<Dashboard>("/dashboards", { signal }),
      api<Notification[]>("/me/notifications?limit=20", { signal }),
    ]);
    if (!nurse) return { dashboard, notifications, nurse: null };
    const [profile, history, applications, saved] = await Promise.all([
      getProfile(signal),
      allHistory(signal),
      allPages<Application>("/me/applications", signal),
      favorites(signal),
    ]);

    return {
      dashboard,
      notifications,
      nurse: {
        profile,
        history,
        applications,
        saved,
      },
    };
  }, user?.id || "");
  async function act(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    setError("");
    try {
      await action();
      r.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const data = r.data?.nurse;
  const next = data?.history
    .filter(
      (m) => m.status === "ACTIVE" && new Date(m.end_at).getTime() > Date.now(),
    )
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))[0];
  const firstName = (user?.prenom || "").includes("@") ? "" : user?.prenom;
  function isSaved(m: Listing) {
    return !!data?.saved.some(
      (f) =>
        f.kind === (m.id.startsWith("e_") ? "EXTERNAL" : "MISSION") &&
        f.target_id === m.id.slice(2),
    );
  }
  return (
    <div className={u.page}>
      <header className={u.header}>
        <div>
          <p className={u.eyebrow}>
            {nurse ? "Espace intérimaire" : "Espace entreprise"}
          </p>
          <h1>Bonjour{firstName ? ` ${firstName}` : ""},</h1>
          <p className={u.subtitle}>
            Vos missions et vos démarches, au même endroit.
          </p>
        </div>
        {!firstName && nurse && (
          <ButtonLink to="/profil#prenom" variant="outline">
            Renseigner mon prénom
          </ButtonLink>
        )}
      </header>
      {nurse && <BankReminder />}
      {error && (
        <p role="alert" className={u.feedback}>
          {error}
        </p>
      )}
      {r.loading ? (
        <p role="status">Chargement de votre espace…</p>
      ) : r.error ? (
        <div role="alert" className={u.feedback}>
          {r.error}
          <Button onClick={r.reload}>Réessayer</Button>
        </div>
      ) : (
        <>
          {data ? (
            <>
              <div className={s.stats}>
                <Link to="/candidatures" className={s.stat}>
                  <span className={s.icon}>
                    <Icon name="file-text" />
                  </span>
                  <span>
                    <strong>
                      {
                        data.applications.filter((a) =>
                          ["SUBMITTED", "SELECTED"].includes(a.status),
                        ).length
                      }
                    </strong>
                    <small>candidatures en cours</small>
                  </span>
                  <Icon name="chevron" size={17} />
                </Link>
                <Link to="/historique" className={s.stat}>
                  <span className={`${s.icon} ${s.teal}`}>
                    <Icon name="briefcase" />
                  </span>
                  <span>
                    <strong>
                      {
                        data.history.filter(
                          (a) =>
                            a.status === "ACTIVE" &&
                            Date.parse(a.end_at) > Date.now(),
                        ).length
                      }
                    </strong>
                    <small>missions à venir ou en cours</small>
                  </span>
                  <Icon name="chevron" size={17} />
                </Link>
                <Link to="/favoris" className={s.stat}>
                  <span className={s.icon}>
                    <Icon name="heart-outline" />
                  </span>
                  <span>
                    <strong>{data.saved.length}</strong>
                    <small>favoris enregistrés</small>
                  </span>
                  <Icon name="chevron" size={17} />
                </Link>
              </div>
              <div className={s.dashboard}>
                <div className={u.stack}>
                  <section className={u.card}>
                    <div className={u.row}>
                      <h2>Votre prochaine mission</h2>
                      {next && <span className={u.badge}>Confirmée</span>}
                    </div>
                    {next ? (
                      <>
                        <div className={s.missionTitle}>
                          <span className={s.icon}>
                            <Icon name="building" />
                          </span>
                          <h3>{next.title}</h3>
                        </div>
                        <p className={s.date}>
                          <Icon name="calendar" size={19} />
                          {date(next.start_at)} — {date(next.end_at)}
                        </p>
                        <div className={u.actions}>
                          <ButtonLink to={"/missions/m_" + next.mission_id}>
                            Voir la mission
                          </ButtonLink>
                          <ConfirmationButton assignmentId={next.id} />
                        </div>
                      </>
                    ) : (
                      <div className={u.empty}>
                        <p>
                          Aucune mission confirmée à venir. Retrouvez les offres
                          qui vous intéressent.
                        </p>
                        <ButtonLink to="/missions">
                          Rechercher une mission
                        </ButtonLink>
                      </div>
                    )}
                  </section>
                  <MixedRecommendations userId={user!.id} isSaved={isSaved} busy={!!busy} onFavorite={m => void act(m.id, () => favorite(m, isSaved(m)))} />
                </div>
                <div className={u.stack}>
                  <section className={u.card}>
                    <h2 className={u.cardHeading}>
                      <Icon name="calendar" />
                      Vos disponibilités
                    </h2>
                    {data.profile.available
                      .filter((p) => Date.parse(p.end) > Date.now())
                      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
                      .slice(0, 3)
                      .map((p, i) => (
                        <p key={i} className={s.period}>
                          <Icon name="calendar" size={17} />
                          {periodLabel(p)}
                        </p>
                      ))}
                    {!data.profile.available.some(
                      (p) => Date.parse(p.end) > Date.now(),
                    ) && (
                      <p className={u.muted}>
                        Ajoutez vos prochaines journées disponibles dans votre
                        planning.
                      </p>
                    )}
                    <ButtonLink to="/calendrier" block>
                      Mettre à jour
                    </ButtonLink>
                  </section>
                  <section className={u.card}>
                    <h2 className={u.cardHeading}>
                      <Icon name="bell" />
                      Notifications de mission
                    </h2>
                    {notificationList()}
                    {user && <NotificationPreferences key={user.id} userId={user.id} />}
                  </section>
                </div>
              </div>
              <section className={`${u.card} ${s.dossier}`}>
                <span className={`${s.icon} ${s.teal}`}>
                  <Icon name="folder" />
                </span>
                <div>
                  <h2>Votre dossier professionnel</h2>
                  <p className={u.muted}>
                    Retrouvez vos informations et vos justificatifs.
                  </p>
                </div>
                <ButtonLink to="/dossier" variant="ghost">
                  Ouvrir mon dossier →
                </ButtonLink>
              </section>
            </>
          ) : (
            <>
              <section className={u.card}>
                <h2>Mon activité</h2>
                <div className={u.actions}><ButtonLink to="/gestion/missions/nouvelle">Créer une offre</ButtonLink><ButtonLink to="/besoins" variant="outline">Créer ou compléter un besoin</ButtonLink><Button variant="ghost" onClick={r.reload}>Actualiser</Button></div>
                <div className={s.stats}>
                  <Link to="/besoins"><strong>{r.data?.dashboard.activity?.needs ?? 0}</strong><p>Besoins enregistrés</p></Link>
                  <Link to="/missions"><strong>{r.data?.dashboard.activity?.applications ?? 0}</strong><p>Candidatures à traiter</p></Link>
                  {Object.entries(r.data?.dashboard.counts || {}).map(
                    ([key, value]) => (
                      <div key={key}>
                        <strong>{value}</strong>
                        <p>{labels[key] || key}</p>
                      </div>
                    ),
                  )}
                </div>
                <ButtonLink to="/missions">Consulter les missions</ButtonLink>
              </section>
              <section className={u.card}>
                <h2>Mes derniers besoins</h2>
                {r.data?.dashboard.recentNeeds?.length ? r.data.dashboard.recentNeeds.map(n=><article key={n.id}><h3>{n.title}</h3><p>{n.mission_count ? `${n.mission_count} mission(s) préparée(s) — consulter leur état` : "À compléter — aucune mission créée"}</p><ButtonLink variant="outline" to={"/besoins#besoin-"+n.id}>Voir le besoin et son suivi</ButtonLink></article>) : <p>Aucun besoin enregistré.</p>}
              </section>
              <section className={u.card}>
                <h2>Mes dernières offres</h2>
                {r.data?.dashboard.recentMissions?.length ? r.data.dashboard.recentMissions.map(m=><article key={m.id}><h3>{m.title}</h3><p>{labels[m.status] || m.status} · {date(m.start_at)} · {m.application_count} candidature(s) à traiter</p><ButtonLink to={"/gestion/missions/"+m.id}>Gérer l’offre et les candidatures</ButtonLink></article>) : <p>Aucune mission créée. Les besoins ci-dessus doivent être complétés puis publiés pour apparaître dans l’espace intérimaire.</p>}
              </section>
              <section className={u.card}>
                <h2>Notifications récentes</h2>
                {notificationList()}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
  function notificationList() {
    return r.data?.notifications.length ? (
      <ul className={u.list}>
        {r.data.notifications.slice(0, 5).map((n) => (
          <li key={n.id} className={u.listItem}>
            <p>
              <strong>{n.title || n.message || "Nouvelle notification"}</strong>
            </p>
            <div className={u.actions}>
              <Link
                className={s.textLink}
                to={n.href || (n.kind === "CONFIRMATION" ? "/historique" : "/missions")}
              >
                {n.kind === "CONFIRMATION"
                  ? "Voir mes confirmations"
                  : "Consulter les missions"}
              </Link>
              {!n.read_at ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!!busy}
                  onClick={() =>
                    void act(n.id, () =>
                      api("/me/notifications/" + n.id + "/read", {
                        method: "POST",
                      }),
                    )
                  }
                >
                  Marquer comme lue
                </Button>
              ) : (
                <span className={u.muted}>Lue</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className={u.muted}>Vous êtes à jour. Aucune notification.</p>
    );
  }
}
