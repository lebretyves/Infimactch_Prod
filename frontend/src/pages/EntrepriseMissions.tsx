import { useSearchParams } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { enterpriseMissions, date, statusLabels } from "@/services/market";
import { Button, ButtonLink } from "@/ui/Button";
import s from "./MesEtablissements.module.css";
export default function EntrepriseMissions() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const establishmentId = params.get("establishmentId") || undefined;
  const establishmentName = params.get("establishmentName") || "Établissement sélectionné";
  const rawOffset = Number(params.get("offset"));
  const offset = Number.isFinite(rawOffset) ? Math.min(10000, Math.max(0, Math.floor(rawOffset))) : 0;
  const r = useRemote(signal => enterpriseMissions(offset, signal, establishmentId), `${user?.id}:${offset}:${establishmentId || "all"}`);
  function move(next: number) { const updated = new URLSearchParams(params); updated.set("offset", String(next)); setParams(updated); }
  return <div className={s.page}>
    <header><h1>{establishmentId ? "Missions de l’établissement" : "Mes missions et leur suivi"}</h1>
      <p>{establishmentId ? (r.data?.[0]?.establishment_name || establishmentName) : "Retrouvez toutes les vacations de vos établissements, leurs candidatures et leurs affectations."}</p>
    </header>
    <div className={s.actions}>
      <ButtonLink to={establishmentId ? `/gestion/missions/nouvelle?${new URLSearchParams({ establishmentId })}` : "/gestion/missions/nouvelle"}>Créer une mission</ButtonLink>
      <ButtonLink to="/mes-etablissements" variant="outline">Mes établissements</ButtonLink>
      {establishmentId && <ButtonLink to="/missions" variant="outline">Toutes les missions</ButtonLink>}
    </div>
    {r.loading ? <p role="status">Chargement des missions…</p> : r.error ? <div role="alert"><p>{r.error}</p><Button onClick={r.reload}>Réessayer</Button></div> : <>
      <div className={s.list}>
        {r.data?.map(m => <article key={m.id} className={s.mission}>
          <p className={s.site}>{m.establishment_name || (establishmentId ? establishmentName : "Établissement non renseigné")}</p>
          <h2>{m.title}</h2><p>{statusLabels[m.status || ""] || "État à vérifier"} · {m.qualification}</p>
          <p>{date(m.start_at, m.timezone)} → {date(m.end_at, m.timezone)} · heure locale</p>
          <ButtonLink to={"/gestion/missions/" + m.id} variant="outline" size="sm">Mission et candidatures</ButtonLink>
        </article>)}
        {!r.data?.length && <p className={s.empty}>Aucune mission {establishmentId ? "pour cet établissement sur cette page" : "sur cette page"}.</p>}
      </div>
      <nav className={s.pagination} aria-label="Pages des missions"><Button variant="outline" disabled={!offset} onClick={() => move(Math.max(0, offset - 20))}>Précédent</Button><span>Page {Math.floor(offset / 20) + 1}</span><Button variant="outline" disabled={(r.data?.length || 0) < 20} onClick={() => move(offset + 20)}>Suivant</Button></nav>
    </>}
  </div>;
}
