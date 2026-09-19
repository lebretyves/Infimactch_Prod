import {EnterpriseConversion} from '@/components/EnterpriseConversion';
import { BankReminder } from "@/components/BankReminder";
import { MixedRecommendations } from "@/components/MixedRecommendations";
import { UpcomingMissions } from "@/components/UpcomingMissions";
import { notificationHref } from "@/lib/notificationHref";
import { useEffect, useState } from "react";
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
import { availabilityDateLabel } from "@/lib/availabilityDateLabel";
import { Button, ButtonLink } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import u from "@/components/NurseUI.module.css";
import s from "./Accueil.module.css";
type Dashboard = {
  family: string;
  counts: Record<string, number | string>;
  activity?: { needs: number; applications: number };
  recentNeeds?: {
    id: string;
    title: string;
    created_at: string;
    mission_count: number;
  }[];
  recentMissions?: {
    id: string;
    title: string;
    status: string;
    timezone?: string;
  start_at: string;
    end_at: string;
    application_count: number;
  }[];
};
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
  OPEN: "Missions publiées (ouvertes)",
  FILLED: "Missions pourvues",
  COMPLETED: "Missions terminées",
  CANCELLED: "Missions annulées",
};
export default function Accueil() {
  const { user } = useAuth();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const nurse = user?.role === "interimaire";
  const [preparationOpen,setPreparationOpen] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  useEffect(() => { const media=window.matchMedia("(min-width: 768px)"); const sync=()=>setPreparationOpen(media.matches); media.addEventListener("change",sync); return ()=>media.removeEventListener("change",sync); }, []);
  const r = useRemote(async (signal) => {
    const [dashboard, notifications] = await Promise.all([
      api<Dashboard>("/dashboards", { signal }),
      nurse ? Promise.resolve([] as Notification[]) : api<Notification[]>("/me/notifications?limit=20", { signal }),
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
  const availabilityLabels = [
    ...new Set(
      (data?.profile.available || [])
        .filter((period) => Date.parse(period.end) > Date.now())
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
        .map(availabilityDateLabel),
    ),
  ].slice(0, 3);
  const firstName = (user?.prenom || "").includes("@") ? "" : user?.prenom;
  function isSaved(m: Listing) {
    return !!data?.saved.some(
      (f) =>
        f.kind === (m.id.startsWith("e_") ? "EXTERNAL" : "MISSION") &&
        f.target_id === m.id.slice(2),
    );
  }
  return (
    <div className={`${u.page} ${nurse ? s.nursePage : ""}`}>
      <header className={u.header}>
        <div>
          <p className={u.eyebrow}>
            {nurse ? "Espace intérimaire" : "Espace entreprise"}
          </p>
          <h1>Bonjour{firstName ? ` ${firstName}` : ""},</h1>
          <p className={u.subtitle}>
            {nurse
              ? "Votre prochaine mission commence ici."
              : "Vos missions et vos démarches, au même endroit."}
          </p>
        </div>
        {nurse && (
          <ButtonLink to="/missions">
            <Icon name="search" size={18} />
            Rechercher une offre
          </ButtonLink>
        )}
      </header>
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
              <div className={s.preparation}>
                <UpcomingMissions assignments={data.history} limit={1}/>
                <details className={`${u.card} ${s.preparationTools}`} open={preparationOpen} onToggle={e=>setPreparationOpen(e.currentTarget.open)}>
                  <summary>Disponibilités, profil et dossier</summary>
                  <div className={s.toolsContent}>
                  <section className={u.card}>
                    <h2 className={u.cardHeading}>
                      <Icon name="calendar" />
                      Vos disponibilités
                    </h2>
                    {availabilityLabels.map((label) => (
                      <p key={label} className={s.period}>
                        <Icon name="calendar" size={17} />
                        {label}
                      </p>
                    ))}
                    {!data.profile.available.some(
                      (p) => Date.parse(p.end) > Date.now(),
                    ) && (
                      <p className={u.muted}>
                        Ajoutez vos prochaines disponibilités dans votre
                        planning.
                      </p>
                    )}
                    <ButtonLink to="/calendrier" block>
                      Mettre à jour
                    </ButtonLink>
                  </section>
                  <section className={u.card}>
                    <h2 className={u.cardHeading}>
                      <Icon name="user" />
                      Votre profil de recherche
                    </h2>
                    <p className={u.muted}>
                      {data.profile.qualifications.length
                        ? data.profile.qualifications.join(" · ")
                        : "Qualification à compléter"}
                    </p>
                    {data.profile.details?.mobilityCity && (
                      <p className={u.muted}>
                        {data.profile.details.mobilityCity}
                        {data.profile.radius_km
                          ? ` · ${data.profile.radius_km} km`
                          : ""}
                      </p>
                    )}
                    <div className={u.actions}>
                      <ButtonLink to="/profil" variant="outline" size="sm">
                        Compléter mon profil
                      </ButtonLink>
                      <Link to="/calendrier">Ma mobilité</Link>
                    </div>
                    <Link to="/dossier" className={s.dossierLink}><Icon name="folder" size={17}/>Votre dossier professionnel →</Link>
                  </section>
                  </div>
                </details>
              </div>
              <BankReminder />
                  <MixedRecommendations
                    userId={user!.id}
                    isSaved={isSaved}
                    busy={!!busy}
                    onFavorite={(m) =>
                      void act(m.id, () => favorite(m, isSaved(m)))
                    }
                  />
            </>
          ) : (
            <>
              <section className={u.card}>
                <h2>Mon activité</h2><p>Gérez vos missions et leurs candidatures par établissement.</p>
                <div className={u.actions}>
                  <ButtonLink to="/gestion/missions/nouvelle">
                    Créer une offre
                  </ButtonLink>
                  <ButtonLink to="/missions?mode=edit" variant="outline">
                    Modifier une offre
                  </ButtonLink>
                  <Button variant="ghost" onClick={r.reload}>
                    Actualiser
                  </Button>
                </div>
                <div className={s.stats}>
                  <Link to="/besoins">
                    <strong>{r.data?.dashboard.activity?.needs ?? 0}</strong>
                    <p>Besoins à préparer</p>
                  </Link>
                  <Link to="/candidatures">
                    <strong>
                      {r.data?.dashboard.activity?.applications ?? 0}
                    </strong>
                    <p>Candidatures à traiter</p>
                  </Link>
                  {Object.entries(r.data?.dashboard.counts || {}).map(
                    ([key, value]) => (
                      <div key={key}>
                        <strong>{value}</strong>
                        <p>{labels[key] || key}</p>
                      </div>
                    ),
                  )}
                </div>
                <div className={u.actions}><ButtonLink to="/mes-etablissements">Mes établissements</ButtonLink><ButtonLink to="/missions" variant="outline">Toutes les missions</ButtonLink></div>
              </section>
              <EnterpriseConversion userId={user!.id}/>
              <section className={u.card}>
                <h2>Mes derniers besoins</h2>
                {r.data?.dashboard.recentNeeds?.length ? (
                  r.data.dashboard.recentNeeds.map((n) => (
                    <article key={n.id}>
                      <h3>{n.title}</h3>
                      <p>
                        {n.mission_count
                          ? `${n.mission_count} mission(s) préparée(s) — consulter leur état`
                          : "À compléter — aucune mission créée"}
                      </p>
                      <ButtonLink
                        variant="outline"
                        to={"/besoins#besoin-" + n.id}
                      >
                        Voir le besoin et son suivi
                      </ButtonLink>
                    </article>
                  ))
                ) : (
                  <p>Aucun besoin enregistré.</p>
                )}
              </section>
              <section className={u.card}>
                <h2>Mes dernières offres</h2>
                {r.data?.dashboard.recentMissions?.length ? (
                  r.data.dashboard.recentMissions.map((m) => (
                    <article key={m.id}>
                      <h3>{m.title}</h3>
                      <p>
                        {labels[m.status] || m.status} · {date(m.start_at, m.timezone)} ·{" "}
                        {m.application_count} candidature(s) à traiter
                      </p>
                      <ButtonLink to={"/gestion/missions/" + m.id}>
                        Gérer l’offre et les candidatures
                      </ButtonLink>
                    </article>
                  ))
                ) : (
                  <p>
                    Aucune mission créée. Les besoins ci-dessus doivent être
                    complétés puis publiés pour apparaître dans l’espace
                    intérimaire.
                  </p>
                )}
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
                to={notificationHref(n.href || (n.kind === "CONFIRMATION" ? "/historique" : "/missions"), n.id)}
              >
                {n.kind === "CONFIRMATION"
                  ? "Voir mes confirmations"
                  : "Consulter les missions"}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className={u.muted}>Vous êtes à jour. Aucune notification.</p>
    );
  }
}
