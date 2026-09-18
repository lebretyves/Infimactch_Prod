import { useEffect, useState } from "react";
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
  const editMode = params.get("mode") === "edit";
  const qualification = params.get("qualification") || "";
  const location = params.get("location") || "";
  const vacationDate = params.get("date") || "";
  const [draft, setDraft] = useState({ qualification, location, date: vacationDate });
  useEffect(() => { setDraft({ qualification, location, date: vacationDate }); }, [qualification, location, vacationDate]);
  const rawOffset = Number(params.get("offset"));
  const offset = Number.isFinite(rawOffset) ? Math.min(10000, Math.max(0, Math.floor(rawOffset))) : 0;
  const r = useRemote(signal => enterpriseMissions(offset, signal, establishmentId, { qualification, location, date: vacationDate }), JSON.stringify([user?.id, offset, establishmentId, qualification, location, vacationDate]));
  function move(next: number) { const updated = new URLSearchParams(params); updated.set("offset", String(next)); setParams(updated); }
  function search(reset = false) {
    const updated = new URLSearchParams(params);
    updated.delete("offset");
    for (const key of ["qualification", "location", "date"] as const) {
      const value = reset ? "" : draft[key].trim();
      if (value) updated.set(key, value); else updated.delete(key);
    }
    if (reset) setDraft({ qualification: "", location: "", date: "" });
    setParams(updated);
  }
  return <div className={s.page}>
    <header><h1>{editMode ? "Modifier une offre" : establishmentId ? "Missions de l’établissement" : "Mes missions et leur suivi"}</h1>
      <p>{establishmentId ? (r.data?.[0]?.establishment_name || establishmentName) : editMode ? "Recherchez l’offre à modifier par métier, lieu ou date de vacation." : "Retrouvez toutes les vacations de vos établissements, leurs candidatures et leurs affectations."}</p>
    </header>
    <div className={s.actions}>
      <ButtonLink to={establishmentId ? `/gestion/missions/nouvelle?${new URLSearchParams({ establishmentId })}` : "/gestion/missions/nouvelle"}>Créer une mission</ButtonLink>
      <ButtonLink to="/mes-etablissements" variant="outline">Mes établissements</ButtonLink>
      {establishmentId && <ButtonLink to={editMode ? "/missions?mode=edit" : "/missions"} variant="outline">Tous les établissements</ButtonLink>}
    </div>
    <form className={s.missionSearch} onSubmit={e => { e.preventDefault(); search(); }}>
      <div><label htmlFor="mission-qualification">Métier</label><select id="mission-qualification" value={draft.qualification} onChange={e => setDraft(v => ({ ...v, qualification: e.target.value }))}><option value="">Tous les métiers</option><option value="IDE">IDE</option><option value="IADE">IADE</option><option value="IBODE">IBODE</option></select></div>
      <div><label htmlFor="mission-location">Lieu</label><input id="mission-location" type="search" maxLength={150} placeholder="Ville, adresse ou établissement" value={draft.location} onChange={e => setDraft(v => ({ ...v, location: e.target.value }))} /></div>
      <div><label htmlFor="mission-date">Date de vacation</label><input id="mission-date" type="date" value={draft.date} onChange={e => setDraft(v => ({ ...v, date: e.target.value }))} aria-describedby="mission-date-help" /></div>
      <div className={s.actions}><Button type="submit">Rechercher</Button><Button type="button" variant="ghost" onClick={() => search(true)}>Réinitialiser</Button></div>
      <p id="mission-date-help" className={s.searchHint}>Date locale de l’établissement, y compris les vacations de nuit en cours ce jour-là.</p>
    </form>
    {r.loading ? <p role="status">Chargement des missions…</p> : r.error ? <div role="alert"><p>{r.error}</p><Button onClick={r.reload}>Réessayer</Button></div> : <>
      <div className={s.list}>
        {r.data?.map(m => <article key={m.id} className={s.mission}>
          <p className={s.site}>{m.establishment_name || (establishmentId ? establishmentName : "Établissement non renseigné")}</p>
          <h2>{m.title}</h2><p>{statusLabels[m.status || ""] || "État à vérifier"} · {m.qualification}</p>
          <p>{date(m.start_at, m.timezone)} → {date(m.end_at, m.timezone)} · heure locale</p>
          <div className={s.actions}>{editMode && m.can_manage && (m.status === "OPEN" || m.status === "DRAFT") && <ButtonLink to={"/gestion/missions/" + m.id + "/modifier"} size="sm">Modifier cette offre</ButtonLink>}<ButtonLink to={"/gestion/missions/" + m.id} variant="outline" size="sm">Mission et candidatures</ButtonLink></div>
        </article>)}
        {!r.data?.length && <p className={s.empty}>Aucune mission ne correspond à cette recherche sur cette page.</p>}
      </div>
      <nav className={s.pagination} aria-label="Pages des missions"><Button variant="outline" disabled={!offset} onClick={() => move(Math.max(0, offset - 20))}>Précédent</Button><span>Page {Math.floor(offset / 20) + 1}</span><Button variant="outline" disabled={(r.data?.length || 0) < 20 || offset >= 10000} onClick={() => move(offset + 20)}>Suivant</Button></nav>
    </>}
  </div>;
}
