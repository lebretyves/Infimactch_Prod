import type { Ref } from "react";
import type { Favorite, Listing } from "@/services/market";
import { MissionCard } from "@/ui/MissionCard";
import { Button, ButtonLink } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { MissionPagination } from "./MissionPagination";
import s from "../Missions.module.css";
import u from "../MarketPages.module.css";

const number = (v: number) => v.toLocaleString("fr-FR");
type Props = {
  busy: boolean;
  error: string;
  retry: () => void;
  saved: {
    data: Favorite[] | null;
    error: string;
    loading: boolean;
    reload: () => void;
  };
  summary: Ref<HTMLDivElement>;
  total: number;
  offset: number;
  items: Listing[];
  currentPage: number;
  lastPage: number;
  available: string;
  hasAvailability: boolean;
  filtered: boolean;
  reset: () => void;
  update: (values: Record<string, string | number>) => void;
};

export function MissionResults({
  busy,
  error,
  retry,
  saved,
  summary,
  total,
  offset,
  items,
  currentPage,
  lastPage,
  available,
  hasAvailability,
  filtered,
  reset,
  update,
}: Props) {
  return (
    <>
      {busy ? (
        <div className={u.empty} role="status">
          Chargement des offres…
        </div>
      ) : error ? (
        <section className={u.empty} role="alert">
          <h2>Le chargement des offres a échoué</h2>
          <p>{error}</p>
          <Button onClick={retry}>Réessayer</Button>
        </section>
      ) : (
        <>
          {saved.error && (
            <p className={u.notice}>
              Vos favoris ne sont pas disponibles.{" "}
              <button onClick={saved.reload}>Réessayer</button>
            </p>
          )}
          <div className={u.row} ref={summary} tabIndex={-1}>
            <div role="status" aria-live="polite">
              <h2 className={s.resultTitle}>
                {number(total)}{" "}
                {total === 1 ? "offre disponible" : "offres disponibles"}
              </h2>
              <p className={s.help}>
                {total > 0
                  ? `${number(offset + 1)}–${number(offset + items.length)} sur ${number(total)} · Page ${number(currentPage)} sur ${number(lastPage)}`
                  : "Aucun résultat pour le moment."}
              </p>
            </div>
          </div>
          <div className={u.grid}>
            {items.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                initialFavorite={saved.data?.some(
                  (f) =>
                    f.target_id === m.id.slice(2) &&
                    f.kind === (m.id.startsWith("e_") ? "EXTERNAL" : "MISSION"),
                )}
                favoriteAvailable={!saved.loading && !saved.error}
              />
            ))}
          </div>
          {!total && (
            <section className={u.empty}>
              <Icon name="search" size={32} />
              <h2>Aucune offre pour ces critères</h2>
              <p>
                {available === "1" && !hasAvailability
                  ? "Renseignez vos disponibilités pour retrouver les missions compatibles."
                  : "Élargissez vos critères ou consultez les offres plus tard."}
              </p>
              <div className={s.emptyActions}>
                {filtered ? (
                  <Button variant="outline" onClick={reset}>
                    Effacer les filtres
                  </Button>
                ) : (
                  <ButtonLink to="/calendrier" variant="outline">
                    Mes disponibilités
                  </ButtonLink>
                )}
              </div>
            </section>
          )}
          {lastPage > 1 && (
            <MissionPagination
              currentPage={currentPage}
              lastPage={lastPage}
              update={update}
            />
          )}
        </>
      )}
    </>
  );
}
