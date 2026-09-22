import { validRadius } from "@/lib/searchArea";
import { MobilityLocation } from "@/components/MobilityLocation";
import { validCoordinates } from "@/components/SearchPlace";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { NavLink, Link } from "react-router";
import { useRemote } from "@/lib/useRemote";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import {
  getProfile,
  saveProfile,
  updateAvailability,
  updateSearchArea,
  type ProfessionalProfile,
  type Period,
  type AvailabilityState,
  type AvailabilityChange,
} from "@/services/profile";
import { allHistory, type Assignment } from "@/services/nurse";
import { AddToPersonalCalendar } from "@/components/AddToPersonalCalendar";
import {
  AVAILABILITY_SLOTS,
  SLOT_STATUS_LABELS,
  parisDateInput,
  addCalendarDays,
  calendarDateLabel,
  parisDayPeriod,
  slotPeriod,
  slotStatus,
  nextSlotState,
  buildAvailabilityChanges,
  exactParisPeriodLabel,
  type SlotKey,
} from "@/lib/availabilitySlots";
import { Button, ButtonLink } from "@/ui/Button";
import { TextField, SelectField } from "@/ui/Field";
import { Checkbox, Radio } from "@/ui/Choice";
import { Icon } from "@/ui/Icon";
import u from "@/components/NurseUI.module.css";
import s from "./Calendrier.module.css";
type Entry = { kind: "available" | "unavailable"; period: Period };
function Editor({
  initial,
  history,
}: {
  initial: ProfessionalProfile;
  history: Assignment[];
}) {
  const [p, setP] = useState(initial),
    [anchor, setAnchor] = useState(parisDateInput()),
    [view, setView] = useState("week"),
    [detailDate, setDetailDate] = useState<string | null>(null),
    [kind, setKind] = useState<AvailabilityState>("available"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [selected, setSelected] = useState<SlotKey[]>(["morning"]),
    [remove, setRemove] = useState<Entry | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [city, setCity] = useState(initial.details?.mobilityCity || (validCoordinates(initial.latitude, initial.longitude) ? "Ma position" : initial.details?.city || "")),
    [radius, setRadius] = useState(initial.radius_km?.toString() || "25"),
    [transport, setTransport] = useState(initial.details?.transport || ""),
    [latitude, setLatitude] = useState(initial.latitude?.toString() || ""),
    [longitude, setLongitude] = useState(initial.longitude?.toString() || "");
  const form = useRef<HTMLFormElement>(null);
  const locked = useRef(false);
  const detailPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (detailDate) {detailPanel.current?.focus({preventScroll: true});detailPanel.current?.scrollIntoView({block: "nearest", behavior: "auto"});}
  }, [detailDate]);
  const monthStart = view === "month" ? anchor.slice(0, 8) + "01" : anchor;
  const weekday = new Date(monthStart + "T12:00:00Z").getUTCDay();
  const first = addCalendarDays(monthStart, -((weekday + 6) % 7));
  const monthLength = new Date(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)), 0).getDate();
  const monthCells = Math.ceil((((weekday + 6) % 7) + monthLength) / 7) * 7;
  const days = Array.from({ length: view === "month" ? monthCells : 7 }, (_, i) =>
    addCalendarDays(first, i),
  );
  const title =
    view === "month"
      ? calendarDateLabel(anchor, { month: "long", year: "numeric" })
      : `${calendarDateLabel(days[0], { day: "numeric", month: "short" })} — ${calendarDateLabel(days[6], { day: "numeric", month: "long", year: "numeric" })}`;
  function move(direction: number) {
    setDetailDate(null);
    if (view === "month") {
      const d = new Date(anchor.slice(0, 8) + "01T12:00:00Z");
      d.setUTCMonth(d.getUTCMonth() + direction);
      setAnchor(d.toISOString().slice(0, 10));
    } else setAnchor(addCalendarDays(anchor, 7 * direction));
  }
  function focusForm() {
    form.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    form.current
      ?.querySelector<HTMLInputElement>('input[type="date"]')
      ?.focus();
  }
  async function run(
    key: string,
    action: () => Promise<void>,
    success: string,
  ) {
    if (locked.current) return false;
    locked.current = true;
    setBusy(key);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      locked.current = false;
      setBusy("");
    }
  }
  async function persist(
    key: string,
    mutate: (latest: ProfessionalProfile) => ProfessionalProfile,
    success: string,
  ) {
    return run(
      key,
      async () => {
        const latest = await getProfile();
        await saveProfile(mutate(latest));
        setP(await getProfile());
      },
      success,
    );
  }
  async function patch(
    key: string,
    changes: AvailabilityChange[],
    success: string,
  ) {
    return run(
      key,
      async () => {
        const result = await updateAvailability(changes);
        setP((current) => ({ ...current, ...result }));
      },
      success,
    );
  }
  async function toggle(date: string, slot: SlotKey) {
    if (locked.current) return;
    const period = slotPeriod(date, slot);
    if (committed(period)) return;
    const current = slotStatus(period, p.available, p.unavailable);
    const next = nextSlotState(current);
    const definition = AVAILABILITY_SLOTS.find((s) => s.key === slot)!;
    await patch(
      `${date}:${slot}`,
      [{ ...period, state: next }],
      `${definition.label} du ${calendarDateLabel(date, { day: "numeric", month: "long" })} : ${SLOT_STATUS_LABELS[next].toLocaleLowerCase("fr-FR")}. Enregistré.`,
    );
  }
  async function saveSlots(e: FormEvent) {
    e.preventDefault();
    if (locked.current) return;
    try {
      const changes = buildAvailabilityChanges(start, end, selected, kind);
      const ok = await patch(
        "period",
        changes,
        `${changes.length} créneau(x) enregistré(s).`,
      );
      if (ok) setAnchor(start);
    } catch (e) {
      setError((e as Error).message);
      setMessage("");
    }
  }
  async function deletePeriod() {
    if (!remove || locked.current) return;
    const ok = await patch(
      "delete",
      [{ ...remove.period, state: "unset" }],
      "Période supprimée. Les créneaux concernés sont non renseignés.",
    );
    if (ok) setRemove(null);
  }
  function overlaps(a: Period, b: Period) {
    return (
      Date.parse(a.start) < Date.parse(b.end) &&
      Date.parse(a.end) > Date.parse(b.start)
    );
  }
  function committed(period: Period) {
    return history.some(m => m.status === "ACTIVE" && overlaps({start: m.start_at, end: m.end_at}, period));
  }
  function stateClass(status: string) {
    return status === "confirmed" ? s.confirmedSlot : status === "available" ? s.available : status === "unavailable" ? s.unavailable : status === "partial-available" ? s.partialAvailable : status === "partial-unavailable" ? s.partialUnavailable : s.unset;
  }
  function renderDay(date: string, compact = false) {
              const day = parisDayPeriod(date);
              if (compact) {
                const statuses = AVAILABILITY_SLOTS.map(slot => {
                  const period = slotPeriod(date, slot.key);
                  return {slot, state: committed(period) ? "confirmed" : slotStatus(period, p.available, p.unavailable)};
                });
                const label = calendarDateLabel(date, {weekday: "long", day: "numeric", month: "long", year: "numeric"});
                return <button key={date} type="button" data-day={date}
                  className={`${s.monthDay} ${date === parisDateInput() ? s.monthToday : ""} ${date.slice(0, 7) !== anchor.slice(0, 7) ? s.monthOutside : ""} ${detailDate === date ? s.monthSelected : ""}`}
                  aria-label={`${label}. ${statuses.map(({slot,state}) => `${slot.label} : ${state === "confirmed" ? "Mission confirmée" : SLOT_STATUS_LABELS[state as keyof typeof SLOT_STATUS_LABELS]}`).join(". ")}. Modifier les créneaux.`}
                  aria-pressed={detailDate === date} aria-expanded={detailDate === date} aria-controls="calendar-day-detail"
                  onClick={() => setDetailDate(date)}>
                  <span className={s.dayNumber}>{Number(date.slice(-2))}</span>
                  <span className={s.dayStrokes} aria-hidden="true">{statuses.map(({slot,state}) => <i key={slot.key} data-indicator-slot={slot.key} data-state={state} className={`${s.stroke} ${stateClass(state)}`} />)}</span>
                </button>;
              }
              return (
                <div
                  key={date}
                  className={`${s.day} ${date === parisDateInput() ? s.today : ""} ${view === "month" && date.slice(0, 7) !== anchor.slice(0, 7) ? s.outsideMonth : ""}`}
                >
                  <h3>
                    {calendarDateLabel(date, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </h3>
                  <div className={s.events}>
                    <div className={s.slots}>
                      {AVAILABILITY_SLOTS.map((slot) => {
                        const period = slotPeriod(date, slot.key);
                        const status = slotStatus(
                          period,
                          p.available,
                          p.unavailable,
                        );
                        const partial = status.startsWith("partial-");
                        const isCommitted = committed(period);
                        return (
                          <button
                            key={slot.key}
                            type="button"
                            className={`${s.slot} ${isCommitted ? s.confirmedSlot : stateClass(status)}`}
                            data-date={date}
                            data-slot={slot.key}
                            data-state={status}
                            aria-label={`${calendarDateLabel(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — ${slot.label} — ${isCommitted ? "Mission confirmée, créneau réservé" : SLOT_STATUS_LABELS[status]}`}
                            aria-busy={busy === `${date}:${slot.key}`}
                            disabled={!!busy || isCommitted}
                            onClick={() => void toggle(date, slot.key)}
                          >
                            <strong>
                              <span className={s.fullLabel}>{slot.label}</span>
                              <span className={s.shortLabel} aria-hidden="true">
                                {slot.key === "afternoon" ? (
                                  <>
                                    Après-
                                    <br />
                                    midi
                                  </>
                                ) : (
                                  slot.label
                                )}
                              </span>
                            </strong>
                            <span className={s.fullStatus}>
                              {isCommitted ? "Mission confirmée" : partial ? "Partiel · " : ""}
                              {!isCommitted && (status === "partial-available"
                                ? "disponible"
                                : status === "partial-unavailable"
                                  ? "indisponible"
                                  : SLOT_STATUS_LABELS[status])}
                            </span>
                            <span className={s.shortStatus} aria-hidden="true">
                              {partial && (
                                <>
                                  Partiel
                                  <br />
                                </>
                              )}
                              {isCommitted ? "Mission" : status === "available" ||
                              status === "partial-available"
                                ? "Dispo."
                                : status === "unavailable" ||
                                    status === "partial-unavailable"
                                  ? "Indispo."
                                  : "Non défini"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {history
                      .filter(
                        (m) =>
                          m.status === "ACTIVE" &&
                          overlaps({ start: m.start_at, end: m.end_at }, day),
                      )
                      .map((m) => (
                        <div key={m.id} className={s.assignmentBlock}>
                          <Link
                            className={s.assignment}
                            to={"/missions/m_" + m.mission_id}
                          >
                            <strong>Mission confirmée</strong>
                            <span>{m.title}</span>
                            <span>{exactParisPeriodLabel({ start: m.start_at, end: m.end_at })}</span>
                            {m.establishment_name && <span>{m.establishment_name}</span>}
                            {m.address && <span>{m.address}</span>}
                          </Link>
                          <AddToPersonalCalendar assignment={m} compact />
                        </div>
                      ))}
                  </div>
                </div>
              );

  }
  return (
    <div className={`${u.page} ${s.calendarPage}`}>
      <header className={u.header}>
        <div>
          <p className={u.eyebrow}>Disponibilités et zone de recherche</p>
          <h1>Mon planning</h1>
          <p className={u.subtitle}>
            Indiquez quand et où vous souhaitez travailler.
          </p>
        </div>
        <Button disabled={!!busy} onClick={focusForm}>
          + Planifier une période
        </Button>
      </header>
      <nav className={u.tabs} aria-label="Planning">
        <NavLink to="/calendrier">Disponibilités</NavLink>
        <a href="#zone-mobilite">Ma zone de recherche et d’alertes</a>
        <NavLink to="/historique">Mes missions</NavLink>
      </nav>
      <div className={s.exportBar}>
        <p className={s.exportHint}>Exportez toutes vos missions confirmées à venir vers Apple, Google ou Outlook.</p>
        <AddToPersonalCalendar assignments={history} />
      </div>
      {error && (
        <p role="alert" className={u.feedback}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={u.feedback}>
          {message}
        </p>
      )}
      {busy && (
        <p role="status" className={s.saving}>
          Enregistrement en cours…
        </p>
      )}
      <div className={s.planning}>
        <section
          className={u.card}
          aria-label="Calendrier de vos disponibilités"
        >
          <div className={s.toolbar}>
            <div className={u.actions}>
              <Button
                variant="secondary"
                size="sm"
                aria-label={
                  view === "week" ? "Semaine précédente" : "Mois précédent"
                }
                onClick={() => move(-1)}
              >
                ‹
              </Button>
              <Button
                variant="secondary"
                size="sm"
                aria-label={
                  view === "week" ? "Semaine suivante" : "Mois suivant"
                }
                onClick={() => move(1)}
              >
                ›
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnchor(parisDateInput())}
              >
                Aujourd’hui
              </Button>
            </div>
            <strong>{title}</strong>
            <SelectField
              label="Vue du calendrier"
              value={view}
              onChange={(e) => {setView(e.target.value);setDetailDate(null);}}
            >
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
            </SelectField>
          </div>
          <TextField
            label="Aller à la date"
            type="date"
            required
            value={anchor}
            onChange={(e) => {
              if (e.target.value) {setAnchor(e.target.value);setDetailDate(null);}
            }}
          />
          <div className={s.instructions}>
            <p>
              <strong>{view === "month" ? "Choisissez un jour, puis un créneau." : "Un clic suffit."}</strong> Non renseigné → Disponible →
              Indisponible → Non renseigné.
            </p>
            <span>
              Enregistrement automatique · Heure de Paris (Europe/Paris)
            </span>
          </div>
          <div className={s.slotHours}>
            {AVAILABILITY_SLOTS.map((slot) => (
              <span key={slot.key}>
                <strong>{slot.label}</strong> {slot.hours}
              </span>
            ))}
          </div>
          <div
            className={`${s.calendar} ${view === "month" ? s.month : ""}`}
            aria-busy={!!busy}
          >
            {view === "month" && ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => <span key={day} className={s.weekday} aria-hidden="true">{day}</span>)}
            {days.map(date => renderDay(date, view === "month"))}
          </div>
          {view === "month" && <p className={s.monthHint}>De gauche à droite : matin · après-midi · nuit. Sélectionnez un jour pour modifier ses créneaux.</p>}
          {view === "month" && detailDate && <section ref={detailPanel} tabIndex={-1} id="calendar-day-detail" className={s.dayDetail} aria-label="Créneaux du jour sélectionné">
            <div className={s.detailHeading}><strong>Modifier mes créneaux</strong><Button variant="ghost" size="sm" onClick={() => {const date=detailDate;setDetailDate(null);requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-day="${date}"]`)?.focus());}}>Fermer</Button></div>
            {renderDay(detailDate)}
          </section>}
          <div className={s.legend}>
            <span>
              <i className={s.blue} />
              Mission confirmée
            </span>
            <span>
              <i className={s.green} />
              Disponible
            </span>
            <span>
              <i className={s.red} />
              Indisponible
            </span>
            <span>
              <i className={s.grey} />
              Non renseigné
            </span>
          </div>
          <p className={s.help}>
            Une case « Partiel » conserve vos horaires existants. Cliquez pour
            rendre tout le créneau disponible. La nuit appartient au jour où
            elle commence et se termine le lendemain à 06 h.
          </p>
        </section>
        <form ref={form} onSubmit={saveSlots} className={u.card}>
          <h2>Planifier une période</h2>
          <p className={s.help}>
            Appliquez le même choix sur plusieurs jours, sans saisir d’heures.
          </p>
          <fieldset className={s.fields} disabled={!!busy}>
            <div className={s.choice}>
              <Radio
                name="disponibilite"
                checked={kind === "available"}
                onChange={() => setKind("available")}
              >
                Disponible
              </Radio>
              <Radio
                name="disponibilite"
                checked={kind === "unavailable"}
                onChange={() => setKind("unavailable")}
              >
                Indisponible
              </Radio>
              <Radio
                name="disponibilite"
                checked={kind === "unset"}
                onChange={() => setKind("unset")}
              >
                Non renseigné
              </Radio>
            </div>
            <TextField
              label="Date de début"
              type="date"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <TextField
              label="Date de fin"
              type="date"
              required
              min={start || undefined}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
            <div className={s.slotChoices}>
              <h3>Créneaux à appliquer</h3>
              {AVAILABILITY_SLOTS.map((slot) => (
                <Checkbox
                  key={slot.key}
                  checked={selected.includes(slot.key)}
                  onChange={(e) =>
                    setSelected((current) =>
                      e.target.checked
                        ? [...current, slot.key]
                        : current.filter((k) => k !== slot.key),
                    )
                  }
                >
                  {slot.label} · {slot.hours}
                </Checkbox>
              ))}
            </div>
            <p className={s.help}>
              Dates de début incluses pour chaque créneau. Les trois cases
              couvrent de 06 h au lendemain à 06 h. Maximum : 200 créneaux par
              enregistrement.
            </p>
            <Button type="submit" loading={busy === "period"}>
              Enregistrer les créneaux
            </Button>
          </fieldset>
        </form>
      </div>
      <section className={u.card}>
        <div className={u.row}>
          <h2 className={u.cardHeading}>
            <Icon name="calendar" />
            Mes périodes enregistrées
          </h2>
          <span className={u.muted}>
            {p.available.length + p.unavailable.length} période(s)
          </span>
        </div>
        <p className={s.help}>
          Horaires exacts en heure de Paris. Les créneaux voisins du même état
          peuvent être regroupés en une période. Pour les ajuster, utilisez les
          cases de l’agenda.
        </p>
        {!p.available.length && !p.unavailable.length && (
          <p className={u.muted}>
            Aucune disponibilité ni indisponibilité renseignée.
          </p>
        )}
        <ul className={u.list}>
          {(["available", "unavailable"] as const).flatMap((k) =>
            p[k].map((period, i) => (
              <li key={k + i} className={`${u.listItem} ${u.row}`}>
                <div>
                  <span
                    className={
                      k === "available" ? s.availableBadge : s.unavailableBadge
                    }
                  >
                    {k === "available" ? "Disponible" : "Indisponible"}
                  </span>
                  <p className={s.periodLabel}>
                    {exactParisPeriodLabel(period)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!!busy}
                  onClick={() => setRemove({ kind: k, period })}
                  aria-label={"Supprimer " + exactParisPeriodLabel(period)}
                >
                  Supprimer
                </Button>
              </li>
            )),
          )}
        </ul>
        {remove && (
          <div className={u.feedback} role="alert">
            <p>
              Supprimer cette période : {exactParisPeriodLabel(remove.period)} ?
            </p>
            <p className={s.help}>
              Toute disponibilité ou indisponibilité sur cet intervalle sera
              effacée.
            </p>
            <div className={u.actions}>
              <Button
                variant="danger"
                loading={busy === "delete"}
                onClick={() => void deletePeriod()}
              >
                Confirmer la suppression
              </Button>
              <Button
                variant="ghost"
                disabled={!!busy}
                onClick={() => setRemove(null)}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </section>
      <form id="zone-mobilite" tabIndex={-1}
        className={u.card}
        onSubmit={(e) => {
          e.preventDefault();
          void run("mobility", async () => {
            const center = validCoordinates(latitude, longitude);
            if (!center || !radius.trim() || !validRadius(radius))
              throw new Error("Choisissez une commune ou une position valide et un rayon entre 0,1 et 1 000 km.");
            const area = await updateSearchArea({...center, radiusKm:Number(radius), city:city.trim() || "Ma position"});
            setP(current => ({...current, ...area}));
          }, "Zone de recherche et d’alertes enregistrée.");
        }}
      >
        <h2 className={u.cardHeading}>
          <Icon name="map-pin" />
          Ma zone de recherche et d’alertes
        </h2>
        <p className={s.help}>Choisissez la ville autour de laquelle vous souhaitez travailler et votre rayon. Cette zone est enregistrée sur votre compte pour la recherche par défaut et les alertes. Votre domicile et vos préférences de notifications restent inchangés.</p>
        <fieldset disabled={!!busy} className={s.fields}>
          <div className={s.mobility}>
            <MobilityLocation
              value={city}
              selected={!!validCoordinates(latitude, longitude)}
              onChange={(value, location) => {
                setCity(value);
                setLatitude(location ? String(location.latitude) : "");
                setLongitude(location ? String(location.longitude) : "");
              }}
            />
            <TextField
              label="Rayon de recherche et d’alertes (km)"
              required
              type="number"
              min={0.1}
              max={1000}
              step="any"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
            <Button
              type="submit"
              loading={busy === "mobility"}
              variant="outline"
            >
              Enregistrer ma zone
            </Button>
          </div>
          <SelectField
            label="Moyen de transport"
            value={transport}
            onChange={(e) => setTransport(e.target.value)}
          >
            <option value="">Non renseigné</option>
            {["Véhicule personnel", "Transports en commun", "Deux-roues"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </SelectField>
          <Button type="button" variant="outline" loading={busy === "transport"} onClick={() => void persist("transport", latest => ({...latest, details:{...latest.details, transport}}), "Moyen de transport enregistré.")}>Enregistrer mon transport</Button>
          <div className={u.actions}>
            <Button
              type="button"
              variant="ghost"
              loading={busy === "locate"}
              onClick={() => {
                void run("locate", async () => {
                  if (!window.isSecureContext) {
                    throw new Error(
                      "La géolocalisation nécessite localhost ou HTTPS. Ouvrez l’app via http://127.0.0.1:5173.",
                    );
                  }
                  if (!navigator.geolocation) {
                    throw new Error("Géolocalisation indisponible sur cet appareil.");
                  }
                  let position: GeolocationPosition;
                  try {
                    position = await new Promise<GeolocationPosition>((resolve, reject) =>
                      navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 15000,
                        maximumAge: 60000,
                        enableHighAccuracy: false,
                      }),
                    );
                  } catch (e) {
                    const code = (e as GeolocationPositionError)?.code;
                    if (code === 1) {
                      throw new Error(
                        "Localisation refusée par le navigateur. Autorisez la position pour ce site, ou saisissez une commune.",
                      );
                    }
                    if (code === 3) {
                      throw new Error(
                        "Délai dépassé pour obtenir la position. Réessayez ou saisissez une commune.",
                      );
                    }
                    throw new Error(
                      "Position indisponible. Saisissez une commune ou les coordonnées manuellement.",
                    );
                  }
                  const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  };
                  setLatitude(String(coords.latitude));
                  setLongitude(String(coords.longitude));
                  try {
                    const result = await api<{
                      address: { address: string; postalCode: string; city: string } | null;
                    }>("/listings/locations/reverse", {
                      method: "POST",
                      body: coords,
                    });
                    if (result.address?.city) {
                      setCity(
                        result.address.postalCode
                          ? `${result.address.city} · ${result.address.postalCode}`
                          : result.address.city,
                      );
                    } else {
                      setCity("Ma position");
                    }
                  } catch {
                    setCity("Ma position");
                  }
                }, "Position obtenue. Enregistrez votre zone pour la conserver.");
              }}
            >
              Utiliser ma position
            </Button>
            <p className={s.help}>
              {latitude && longitude
                ? "Position renseignée pour calculer les distances."
                : "Une position est nécessaire pour calculer les distances."}
            </p>
          </div>
          <details>
            <summary className={s.help}>Coordonnées de ma position</summary>
            <div className={u.grid}>
              <TextField
                label="Latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={latitude}
                onChange={(e) => { setCity(""); setLatitude(e.target.value); }}
              />
              <TextField
                label="Longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={longitude}
                onChange={(e) => { setCity(""); setLongitude(e.target.value); }}
              />
            </div>
          </details>
        </fieldset>
      </form>
      <ButtonLink to="/profil" variant="ghost">
        Retour à mon profil
      </ButtonLink>
    </div>
  );
}
export default function Calendrier() {
  const { user } = useAuth();
  const r = useRemote(async (signal) => {
    const [profile, history] = await Promise.all([
      getProfile(signal),
      allHistory(signal),
    ]);
    return { profile, history };
  }, "calendar:" + user?.id);
  if (user?.role !== "interimaire")
    return (
      <div className={u.page}>
        <h1>Mon planning</h1>
        <ButtonLink to="/accueil">Retour à mon espace</ButtonLink>
      </div>
    );
  return r.loading ? (
    <p role="status">Chargement du planning…</p>
  ) : r.error || !r.data ? (
    <div role="alert" className={u.feedback}>
      {r.error}
      <Button onClick={r.reload}>Réessayer</Button>
    </div>
  ) : (
    <Editor initial={r.data.profile} history={r.data.history} />
  );
}
