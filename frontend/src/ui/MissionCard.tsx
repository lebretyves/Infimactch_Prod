import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Icon } from "./Icon";
import { ButtonLink } from "./Button";
import {
  type Listing,
  favorite,
  date,
  salary,
  sourceLabel,
  externalExpired,
  safeUrl,
} from "@/services/market";
import { labelCode } from "@/data/professional";
import { useAuth } from "@/context/AuthContext";
import s from "./MissionCard.module.css";
export function MissionCard({
  mission,
  initialFavorite = false,
  favoriteAvailable = true,
}: {
  mission: Listing;
  initialFavorite?: boolean;
  favoriteAvailable?: boolean;
}) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(initialFavorite),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => setSaved(initialFavorite), [initialFavorite, mission.id]);
  async function toggle() {
    if (busy || !favoriteAvailable) return;
    setBusy(true);
    setError("");
    try {
      await favorite(mission, saved);
      setSaved(!saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const target =
    "/missions/" +
    mission.id +
    (mission.match_explanation_id
      ? "?correspondance=" + encodeURIComponent(mission.match_explanation_id)
      : "");
  const external = mission.id.startsWith("e_");
  const url = safeUrl(mission.url);
  const expired = externalExpired(mission);
  return (
    <article className={s.carte}>
      <div className={s.haut}>
        <span className={s.type} data-external={external}>
          <Icon name={external ? "briefcase" : "building"} size={14} />
          {external
            ? "Offre externe · " + sourceLabel(mission)
            : "Mission interne"}
        </span>
        {user?.role === "interimaire" && (
          <button
            type="button"
            className={s.favori}
            aria-pressed={saved}
            aria-label={saved ? "Retirer des favoris" : "Ajouter aux favoris"}
            disabled={busy || !favoriteAvailable}
            onClick={toggle}
          >
            <Icon name="heart-outline" size={20} />
          </button>
        )}
      </div>
      <h3 className={s.titre}>
        <Link to={target}>{mission.title}</Link>
      </h3>
      <p className={s.place}>
        {mission.establishment_name ||
          mission.location_label ||
          mission.address ||
          "Localisation à consulter"}
      </p>
      <div className={s.meta}>
        <p>
          <Icon name="graduation" size={17} />
          {["IDE", "IADE", "IBODE"].includes(mission.qualification)
            ? mission.qualification
            : "Qualification à confirmer"}
          {mission.service ? " · " + labelCode(mission.service) : ""}
        </p>
        <p>
          <Icon name="calendar" size={17} />
          {mission.start_at
            ? date(mission.start_at, mission.timezone)
            : "Dates à consulter dans l’annonce"}
        </p>
        <p className={s.taux}>{salary(mission)}</p>
      </div>
      {mission.population && (
        <span className={s.population}>
          {{
            ADULT: "Adultes",
            PEDIATRIC: "Pédiatrie",
            MIXED: "Adultes et pédiatrie",
          }[mission.population] || "Population à préciser"}
        </span>
      )}
      {(mission.publicationDate ||
        mission.distanceKm != null ||
        mission.availabilityCompatible === true) && (
        <p className={s.place}>
          {[
            mission.publicationDate &&
              Number.isFinite(Date.parse(mission.publicationDate)) &&
              `Publiée le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(mission.publicationDate))}`,
            mission.distanceKm != null &&
              `≈ ${Math.round(mission.distanceKm)} km`,
            mission.availabilityCompatible === true &&
              "Compatible avec vos disponibilités",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {!external && mission.matching_score != null && (
        <span className={s.population}>
          Correspondance : {Math.round(mission.matching_score)}/100
        </span>
      )}
      <div className={s.bas}>
        {external && url && !expired ? (
          <>
            <Link className={s.source} to={target}>
              Détails de l’annonce
            </Link>
            <a
              className={s.details}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Voir l’offre source ↗
            </a>
          </>
        ) : (
          <ButtonLink
            to={target}
            variant={external ? "outline" : "primary"}
            size="sm"
            block
          >
            {expired ? "Voir l’annonce expirée" : "Voir la mission"}
          </ButtonLink>
        )}
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
