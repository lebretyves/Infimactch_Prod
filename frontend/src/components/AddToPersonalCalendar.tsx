import { useState } from "react";
import { Button } from "@/ui/Button";
import {
  assignmentsToIcs,
  downloadIcs,
  googleCalendarUrl,
  type CalendarMission,
} from "@/lib/personalCalendar";
import s from "./AddToPersonalCalendar.module.css";

export function AddToPersonalCalendar({
  assignment,
  assignments,
  compact = false,
}: {
  assignment?: CalendarMission;
  assignments?: CalendarMission[];
  compact?: boolean;
}) {
  const [message, setMessage] = useState("");
  const list = assignment ? [assignment] : assignments || [];
  const origin = typeof location !== "undefined" ? location.origin : "https://infimatch.fr";
  const ics = assignmentsToIcs(list, origin);
  if (!ics) return null;
  const google = assignment ? googleCalendarUrl(assignment, origin) : null;
  return (
    <div className={compact ? s.compact : s.row}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMessage("");
          downloadIcs(
            assignment ? `infimatch-mission-${assignment.id.slice(0, 8)}` : "infimatch-missions-confirmees",
            ics,
          );
          setMessage(
            assignment
              ? "Fichier calendrier téléchargé. Ouvrez-le pour l’ajouter à Apple, Google ou Outlook."
              : "Fichier calendrier téléchargé avec vos missions confirmées à venir.",
          );
        }}
      >
        {assignment
          ? compact
            ? "Calendrier"
            : "Ajouter à mon calendrier"
          : "Tout exporter en un clic (.ics)"}
      </Button>
      {google && (
        <>
        <p className={s.status}>Ce lien transmet à Google le titre, les dates, le lieu et le lien de la mission. Le fichier .ics permet un import dans le calendrier de votre choix.</p>
        <a className={s.google} href={google} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          Ouvrir dans Google Calendar
        </a>
        </>
      )}
      {message && (
        <p role="status" className={s.status}>
          {message}
        </p>
      )}
    </div>
  );
}
