import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { managedEstablishments } from "@/services/market";
import { Button, ButtonLink } from "@/ui/Button";
import s from "./MesEtablissements.module.css";

export default function MesEtablissements() {
  const { user } = useAuth();
  return user?.role === "interimaire" ? <Navigate to="/accueil" replace /> : <Establishments />;
}
function Establishments() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const rawOffset = Number(params.get("offset"));
  const offset = Number.isFinite(rawOffset) ? Math.min(10000, Math.max(0, Math.floor(rawOffset))) : 0;
  const [search, setSearch] = useState(q);
  useEffect(() => { setSearch(q); }, [q]);
  const r = useRemote(signal => managedEstablishments(offset, q, signal), `${user?.id}:${offset}:${q}`);
  function move(next: number) { setParams({ ...(q ? { q } : {}), offset: String(next) }); }
  return <div className={s.page}>
    <header className={s.heading}>
      <div><h1>Mes établissements</h1><p>Retrouvez les missions et les candidatures de chaque établissement rattaché à votre compte.</p></div>
      <ButtonLink to="/missions" variant="outline">Toutes les missions</ButtonLink>
    </header>
    <form className={s.search} onSubmit={e => { e.preventDefault(); setParams(search.trim() ? { q: search.trim() } : {}); }}>
      <div><label htmlFor="establishment-search">Rechercher un établissement</label><input id="establishment-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, ville ou FINESS" maxLength={150} /></div>
      <Button type="submit">Rechercher</Button>
      {q && <Button type="button" variant="ghost" onClick={() => { setSearch(""); setParams({}); }}>Réinitialiser</Button>}
    </form>
    <p className={s.note}>Un établissement peut avoir plusieurs missions, chacune correspondant à une vacation. Les missions ouvertes sont visibles par les intérimaires.</p>
    {r.loading ? <p role="status">Chargement des établissements…</p> : r.error ? <div role="alert"><p>{r.error}</p><Button onClick={r.reload}>Réessayer</Button></div> : <>
      <p className={s.result} aria-live="polite">{r.data?.total ?? 0} établissement(s){q ? " correspondant à votre recherche" : " rattaché(s)"}</p>
      <div className={s.list}>
        {r.data?.items.map(e => <article className={s.row} key={e.id}>
          <div className={s.identity}><h2>{e.name}</h2><p>{e.address || "Adresse non renseignée"}</p><small>FINESS {e.finess || "non renseigné"}</small></div>
          <dl className={s.counts}>
            <div className={s.open}><dt>Ouvertes</dt><dd>{e.counts.OPEN}</dd></div>
            {e.counts.DRAFT > 0 && <div><dt>Brouillons</dt><dd>{e.counts.DRAFT}</dd></div>}
            <div><dt>Pourvues</dt><dd>{e.counts.FILLED}</dd></div>
            <div><dt>Terminées</dt><dd>{e.counts.COMPLETED}</dd></div>
            <div><dt>Annulées</dt><dd>{e.counts.CANCELLED}</dd></div>
          </dl>
          <ButtonLink to={`/missions?${new URLSearchParams({ establishmentId: e.id, establishmentName: e.name })}`} variant="outline" size="sm">Voir les missions <span className={s.srOnly}>de {e.name}</span> →</ButtonLink>
        </article>)}
        {!r.data?.items.length && <p className={s.empty}>{q ? "Aucun établissement ne correspond à cette recherche." : "Aucun établissement n’est encore rattaché à votre compte."}</p>}
      </div>
      {!!r.data?.total && <nav className={s.pagination} aria-label="Pages des établissements"><Button variant="outline" disabled={!offset} onClick={() => move(Math.max(0, offset - 20))}>Précédent</Button><span>{offset + 1}–{Math.min(offset + 20, r.data.total)} sur {r.data.total}</span><Button variant="outline" disabled={offset + 20 >= r.data.total} onClick={() => move(offset + 20)}>Suivant</Button></nav>}
    </>}
  </div>;
}
