import { useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useRemote } from "@/lib/useRemote";
import { favorites, removeFavorite, type Favorite } from "@/services/market";
import { Button, ButtonLink } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import s from "./MarketPages.module.css";
export default function Favoris() {
  const { user } = useAuth();
  return user?.role === "interimaire" ? <Favorites /> : <Navigate to="/accueil" replace />;
}
function Favorites() {
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const r = useRemote(favorites, "favorites");
  async function remove(f: Favorite) {
    if (busy) return;
    setBusy(f.kind + f.target_id);
    setError("");
    try {
      await removeFavorite(f.kind, f.target_id);
      r.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <p className={s.eyebrow}>Recherche de missions</p>
          <h1>Mes favoris</h1>
          <p className={s.subtitle}>
            Retrouvez les missions et établissements que vous avez enregistrés.
          </p>
        </div>
      </header>
      <nav className={s.tabs} aria-label="Recherche et favoris">
        <Link to="/missions">
          <Icon name="search" size={18} />
          Pour vous
        </Link>
        <Link to="/favoris" aria-current="page">
          <Icon name="heart-outline" size={18} />
          Favoris
        </Link>
      </nav>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {r.loading ? (
        <div className={s.empty} role="status">
          Chargement des favoris…
        </div>
      ) : r.error ? (
        <div className={s.empty} role="alert">
          <p>{r.error}</p>
          <Button onClick={r.reload}>Réessayer</Button>
        </div>
      ) : (
        <>
          {[false, true].map((facility) => {
            const items = (r.data || []).filter(
              (f) => (f.kind === "ESTABLISHMENT") === facility,
            );
            return (
              <section className={s.card} key={String(facility)}>
                <div className={s.row}>
                  <h2>
                    {facility
                      ? "Établissements enregistrés"
                      : "Missions enregistrées"}
                  </h2>
                  <p className={s.muted}>
                    {items.length} {facility ? "établissement" : "mission"}
                    {items.length === 1 ? "" : "s"}
                  </p>
                </div>
                {items.length ? (
                  <ul className={s.list}>
                    {items.map((f) => (
                      <li className={s.listItem} key={f.kind + f.target_id}>
                        <div>
                          <h3>{f.title || "Élément indisponible"}</h3>
                          <p>
                            <Icon
                              name={facility ? "building" : "briefcase"}
                              size={16}
                            />{" "}
                            {facility
                              ? "Établissement"
                              : f.kind === "EXTERNAL"
                                ? "Annonce externe"
                                : "Mission InfiMatch"}
                          </p>
                          {f.kind === "EXTERNAL" &&
                            (f.active === false ||
                              !!(
                                f.expires_at &&
                                Date.parse(f.expires_at) < Date.now()
                              )) && (
                              <span className={s.badge} data-tone="muted">
                                Annonce expirée
                              </span>
                            )}
                          {f.kind === "MISSION" &&
                            f.status &&
                            f.status !== "OPEN" && (
                              <span className={s.badge} data-tone="muted">
                                La mission n’est plus ouverte
                              </span>
                            )}
                        </div>
                        <div className={s.stack}>
                          <ButtonLink
                            to={
                              facility
                                ? "/etablissements/" + f.target_id
                                : "/missions/" +
                                  (f.kind === "EXTERNAL" ? "e_" : "m_") +
                                  f.target_id
                            }
                          >
                            {facility
                              ? "Voir les missions"
                              : f.kind === "EXTERNAL"
                                ? "Voir l’annonce"
                                : "Voir la mission"}
                          </ButtonLink>
                          <Button
                            variant="ghost"
                            disabled={!!busy}
                            loading={busy === f.kind + f.target_id}
                            onClick={() => remove(f)}
                          >
                            Retirer des favoris
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={s.empty}>
                    <Icon
                      name={facility ? "building" : "heart-outline"}
                      size={28}
                    />
                    <p>
                      {facility
                        ? "Les établissements ajoutés depuis une fiche mission apparaîtront ici."
                        : "Enregistrez une mission pour la retrouver facilement."}
                    </p>
                    <ButtonLink to="/missions" variant="outline">
                      Rechercher une mission
                    </ButtonLink>
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
