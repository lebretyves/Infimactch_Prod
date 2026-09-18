import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { enterpriseApplications } from "@/services/enterpriseApplications";
import { missionDate, statusLabels } from "@/services/market";
import { CandidateMatch } from "@/components/CandidateMatch";
import { Button, ButtonLink } from "@/ui/Button";
import { TextField } from "@/ui/Field";
import s from "./MarketPages.module.css";
import inbox from "./EntrepriseCandidatures.module.css";
export default function EntrepriseCandidatures() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const rawOffset = Number(params.get("offset"));
  const offset = Number.isFinite(rawOffset) ? Math.min(10000, Math.max(0, Math.floor(rawOffset))) : 0;
  const [query, setQuery] = useState(q);
  useEffect(() => { setQuery(q); }, [q]);
  const r = useRemote(signal => enterpriseApplications(offset, q, signal), JSON.stringify([user?.id, offset, q]));
  // Results can shrink after a candidature is processed or a saved URL is reopened.
  useEffect(() => {
    if (r.loading || !r.data || offset === 0 || offset < r.data.total) return;
    const updated = new URLSearchParams(params);
    const lastPage = Math.min(10000, Math.max(0, Math.ceil(r.data.total / 20) - 1) * 20);
    if (lastPage) updated.set("offset", String(lastPage)); else updated.delete("offset");
    setParams(updated, { replace: true });
  }, [r.loading, r.data, offset, params, setParams]);
  function move(next: number) { const updated = new URLSearchParams(params); updated.set("offset", String(next)); setParams(updated); }
  return <div className={s.page}>
    <header className={s.header}><div><h1>Candidatures à traiter</h1><p className={s.subtitle}>Comparez les profils aux missions de vos établissements, puis ouvrez la mission pour traiter chaque candidature.</p></div><ButtonLink to="/mes-etablissements" variant="outline">Mes établissements</ButtonLink></header>
    <form className={inbox.search} onSubmit={e => { e.preventDefault(); setParams(query.trim() ? { q: query.trim() } : {}); }}>
      <TextField label="Rechercher une candidature" type="search" maxLength={150} value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom, mission ou lieu" />
      <div className={s.actions}><Button type="submit">Rechercher</Button>{q && <Button type="button" variant="ghost" onClick={() => { setQuery(""); setParams({}); }}>Réinitialiser</Button>}</div>
    </form>
    {r.loading ? <p className={s.empty} role="status">Chargement des candidatures…</p> : r.error ? <div className={s.empty} role="alert"><p>{r.error}</p><Button onClick={r.reload}>Réessayer</Button></div> : <>
      <p className={inbox.count} aria-live="polite"><strong>{r.data?.total ?? 0}</strong> candidature(s){q ? " correspondant à votre recherche" : " à traiter"}</p>
      {r.data?.items.length ? <div className={inbox.list}>{r.data.items.map(candidate => <article className={s.card} key={candidate.id}>
        <header className={inbox.candidate}><div><h2>{candidate.display_name || "Professionnel de santé"}</h2><p>{candidate.qualifications.join(", ") || "Métier à confirmer"} · {candidate.city || "Ville à confirmer"}</p></div><span className={s.badge}>{statusLabels[candidate.status] || "État à vérifier"}</span></header>
        <div className={inbox.mission}><h3>{candidate.mission.title}</h3><p>{candidate.mission.establishment_name || "Établissement à confirmer"}</p><p>{candidate.mission.address}</p><p>{missionDate(candidate.mission)} → {missionDate(candidate.mission, true)}{candidate.mission.schedule_precision === "DATE" ? " · dates inclusives, horaires à confirmer" : " · heure locale"}</p></div>
        <CandidateMatch matching={candidate.matching} qualification={candidate.mission.qualification} service={candidate.mission.service} />
        <div className={s.actions}><ButtonLink to={"/gestion/missions/" + candidate.mission.id + "#candidatures"}>Traiter la candidature</ButtonLink></div>
      </article>)}</div> : <section className={s.empty}><h2>{q ? "Aucune candidature trouvée" : "Aucune candidature à traiter"}</h2><p>{q ? "Essayez un autre nom, une mission ou un lieu." : "Les réponses reçues pour les missions de vos établissements apparaîtront ici."}</p></section>}
      {!!r.data?.total && <nav className={inbox.pagination} aria-label="Pages des candidatures"><Button variant="outline" disabled={!offset} onClick={() => move(Math.max(0, offset - 20))}>Précédent</Button><span>{Math.min(offset + 1, r.data.total)}–{Math.min(offset + 20, r.data.total)} sur {r.data.total}</span><Button variant="outline" disabled={offset + 20 >= r.data.total || offset >= 10000} onClick={() => move(offset + 20)}>Suivant</Button></nav>}
    </>}
  </div>;
}
