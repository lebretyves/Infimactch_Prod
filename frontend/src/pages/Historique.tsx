import { BankReminder } from "@/components/BankReminder";
import { useState } from "react";
import { Link } from "react-router";
import { useRemote } from "@/lib/useRemote";
import { api } from "@/services/api";
import { date, statusLabels } from "@/services/market";
import { Button, ButtonLink } from "@/ui/Button";
import { SelectField } from "@/ui/Field";
import { ConfirmationButton } from "@/components/ConfirmationButton";
import { Icon } from "@/ui/Icon";
import s from "./MarketPages.module.css";
type Item = {
  id: string;
  mission_id: string;
  application_id?: string;
  title: string;
  status: string;
  start_at: string;
  end_at: string;
  created_at?: string;
  temporal_position: string;
};
async function history(signal?: AbortSignal) {
  const result: Item[] = [];
  for (let offset = 0; ; offset += 50) {
    const page = await api<Item[]>("/me/history?limit=50&offset=" + offset, {
      signal,
    });
    result.push(...page);
    if (page.length < 50) return result;
  }
}
const position = (m: Item) =>
  m.status === "CANCELLED"
    ? "cancelled"
    : m.status === "COMPLETED"
      ? "past"
      : m.temporal_position;
const labels: Record<string, string> = {
  upcoming: "À venir",
  in_progress: "En cours",
  past: "Passée",
  cancelled: "Annulée",
};
export default function Historique() {
  const [period, setPeriod] = useState(""),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState("");
  const r = useRemote(history, "history");
  const selectedItem = r.data?.find((m) => m.id === selected);
  const events = useRemote(
    async (signal) =>
      selectedItem?.application_id
        ? api<{ events: { event: string; created_at: string }[] }>(
            "/applications/" + selectedItem.application_id,
            { signal },
          )
        : null,
    "history-events:" + selectedItem?.application_id,
  );
  const periods = [
    ...new Set(
      (r.data || []).flatMap((m) => {
        const start = new Date(m.start_at),
          end = new Date(m.end_at);
        const result: string[] = [];
        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        for (let i = 0; cursor <= end && i < 120; i++) {
          result.push(
            cursor.getFullYear() +
              "-" +
              String(cursor.getMonth() + 1).padStart(2, "0"),
          );
          cursor.setMonth(cursor.getMonth() + 1);
        }
        return result;
      }),
    ),
  ]
    .sort()
    .reverse();
  const items = (r.data || []).filter((m) => {
    const within =
      !period ||
      (new Date(m.start_at) <
        new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 1) &&
        new Date(m.end_at) >= new Date(period + "-01T00:00:00"));
    return within && (!status || position(m) === status);
  });
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <p className={s.eyebrow}>Mon planning</p>
          <h1>Mon planning</h1>
          <p className={s.subtitle}>
            Consultez vos missions confirmées et leur historique.
          </p>
        </div>
      </header>
      <BankReminder />
      <nav className={s.tabs} aria-label="Mon planning">
        <Link to="/calendrier">
          <Icon name="calendar" size={18} />
          Disponibilités
        </Link>
        <Link to="/historique" aria-current="page">
          <Icon name="file-text" size={18} />
          Historique des missions
        </Link>
      </nav>
      {r.loading ? (
        <div className={s.empty} role="status">
          Chargement des missions…
        </div>
      ) : r.error ? (
        <div className={s.empty} role="alert">
          <p>{r.error}</p>
          <Button onClick={r.reload}>Réessayer</Button>
        </div>
      ) : (
        <section className={s.card}>
          <div className={s.filters}>
            <SelectField
              label="Période"
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setSelected("");
              }}
            >
              <option value="">Toutes les périodes</option>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {new Intl.DateTimeFormat("fr-FR", {
                    month: "long",
                    year: "numeric",
                  }).format(new Date(p + "-01T12:00:00"))}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Statut dans le planning"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setSelected("");
              }}
            >
              <option value="">Tous les statuts</option>
              {Object.entries(labels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </SelectField>
          </div>
          <p className={s.muted} style={{ margin: "18px 0" }}>
            {items.length} mission{items.length === 1 ? "" : "s"}
          </p>
          {items.length ? (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Mission</th>
                    <th>Date et horaires</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr key={m.id}>
                      <td data-label="Mission">{m.title}</td>
                      <td data-label="Dates">
                        {date(m.start_at)}
                        <br />
                        {date(m.end_at)}
                      </td>
                      <td data-label="Statut">
                        <span
                          className={s.badge}
                          data-tone={
                            position(m) === "cancelled"
                              ? "danger"
                              : position(m) === "past"
                                ? "muted"
                                : undefined
                          }
                        >
                          {labels[position(m)] || "À vérifier"}
                        </span>
                        <p>{statusLabels[m.status] || "État à vérifier"}</p>
                      </td>
                      <td data-label="Action">
                        <Button
                          variant="outline"
                          aria-expanded={selected === m.id}
                          onClick={() =>
                            setSelected(selected === m.id ? "" : m.id)
                          }
                        >
                          {selected === m.id ? "Fermer" : "Voir"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={s.empty}>
              <h2>Aucune mission pour cette sélection</h2>
              <p>Vos affectations confirmées apparaîtront dans ce planning.</p>
              <ButtonLink to="/missions" variant="outline">
                Voir les missions
              </ButtonLink>
            </div>
          )}
          {selectedItem && (
            <section
              className={s.card}
              style={{ marginTop: 24 }}
              aria-label="Détails de la mission"
            >
              <div className={s.row}>
                <h2>{selectedItem.title}</h2>
                <span className={s.badge}>
                  {labels[position(selectedItem)] || "À vérifier"}
                </span>
              </div>
              <p>
                {date(selectedItem.start_at)} → {date(selectedItem.end_at)}
              </p>
              {events.loading ? (
                <p role="status">Chargement des événements…</p>
              ) : events.error ? (
                <p className={s.notice}>
                  L’historique détaillé est indisponible.{" "}
                  <Button variant="ghost" onClick={events.reload}>
                    Réessayer
                  </Button>
                </p>
              ) : events.data?.events.length ? (
                <ol className={s.timeline}>
                  {events.data.events
                    .filter((e) =>
                      [
                        "ASSIGNMENT_CREATED",
                        "ASSIGNMENT_CANCELLED",
                        "MISSION_COMPLETED",
                      ].includes(e.event),
                    )
                    .map((e, i) => (
                      <li key={i}>
                        <time dateTime={e.created_at}>
                          {date(e.created_at)}
                        </time>
                        <strong>
                          {
                            {
                              ASSIGNMENT_CREATED:
                                "Affectation confirmée par l’agence",
                              ASSIGNMENT_CANCELLED: "Affectation annulée",
                              MISSION_COMPLETED: "Mission terminée",
                            }[e.event]
                          }
                        </strong>
                      </li>
                    ))}
                </ol>
              ) : (
                <p className={s.muted}>
                  Les dates de la mission sont celles prévues dans votre
                  affectation.
                </p>
              )}
              <div className={s.actions}>
                <ButtonLink
                  to={"/missions/m_" + selectedItem.mission_id}
                  variant="outline"
                >
                  Voir la mission
                </ButtonLink>
                <ConfirmationButton assignmentId={selectedItem.id} />
              </div>
            </section>
          )}
        </section>
      )}
    </div>
  );
}
