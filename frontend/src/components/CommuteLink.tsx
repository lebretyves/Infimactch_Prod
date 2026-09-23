import { googleMapsDirectionsUrl, mapsEndpoint } from "@/lib/commute";
import s from "./CommuteLink.module.css";

type Props = {
  origin: { latitude?: number | null; longitude?: number | null } | null | undefined;
  destination: {
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    location_label?: string | null;
  } | null | undefined;
  destinationLabel?: string;
};

export function CommuteLink({ origin, destination, destinationLabel }: Props) {
  const from = mapsEndpoint(origin);
  const to = mapsEndpoint(
    destination,
    destination?.address || destination?.location_label,
  );

  if (!from || !to) {
    const reason = !from
      ? "Renseignez puis enregistrez votre zone de recherche (Disponibilités et mobilité) pour activer le trajet."
      : "Cette mission n’a ni coordonnées GPS ni adresse exploitable.";
    return (
      <p className={s.unavailable} role="status">
        Itinéraire indisponible. {reason}
      </p>
    );
  }

  const href = googleMapsDirectionsUrl(from, to);
  const place = destinationLabel || "l’établissement";

  return (
    <div className={s.block}>
      <p className={s.meta}>
        Itinéraire routier depuis votre position de référence (profil) vers {place}.
      </p>
      <p className={s.meta}>En ouvrant ce lien, vous transmettez à Google les coordonnées de départ et la destination. Une nouvelle fenêtre s’ouvre.</p>
      <a href={href} target="_blank" rel="noopener noreferrer">
        Voir l’itinéraire sur Google Maps →
      </a>
    </div>
  );
}
