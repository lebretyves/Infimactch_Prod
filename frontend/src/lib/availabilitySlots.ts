import type {
  AvailabilityChange,
  AvailabilityState,
  Period,
} from "@/services/profile";
export const AVAILABILITY_TIME_ZONE = "Europe/Paris";
export const AVAILABILITY_SLOTS = [
  {
    key: "morning",
    label: "Matin",
    hours: "06 h – 14 h",
    startHour: 6,
    endHour: 14,
  },
  {
    key: "afternoon",
    label: "Après-midi",
    hours: "14 h – 22 h",
    startHour: 14,
    endHour: 22,
  },
  {
    key: "night",
    label: "Nuit",
    hours: "22 h – 06 h (+1 j)",
    startHour: 22,
    endHour: 6,
  },
] as const;
export type SlotKey = (typeof AVAILABILITY_SLOTS)[number]["key"];
export type SlotStatus =
  | AvailabilityState
  | "partial-available"
  | "partial-unavailable";
export const SLOT_STATUS_LABELS: Record<SlotStatus, string> = {
  available: "Disponible",
  unavailable: "Indisponible",
  unset: "Non renseigné",
  "partial-available": "Disponible en partie",
  "partial-unavailable": "Indisponible en partie",
};
const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: AVAILABILITY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
function parts(instant: Date) {
  return Object.fromEntries(
    partsFormatter
      .formatToParts(instant)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
}
function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function parisDateInput(value: Date | string = new Date()): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  const p = parts(d);
  return `${p.year.padStart(4, "0")}-${p.month}-${p.day}`;
}
export function addCalendarDays(date: string, days: number): string {
  if (!validDate(date)) throw new Error("Date invalide.");
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function calendarDateLabel(
  date: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Date(date + "T12:00:00Z").toLocaleDateString("fr-FR", {
    ...options,
    timeZone: "UTC",
  });
}
export function parisInstant(date: string, hour: number): string {
  if (!validDate(date) || !Number.isInteger(hour) || hour < 0 || hour > 23)
    throw new Error("Date ou heure invalide.");
  const target = Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00Z`);
  let result = target;
  // The fixed shifts use unambiguous Paris wall-clock hours, including DST dates.
  for (let i = 0; i < 4; i++) {
    const p = parts(new Date(result));
    const wallClock = Date.parse(
      `${p.year.padStart(4, "0")}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`,
    );
    const next = result + target - wallClock;
    if (next === result) break;
    result = next;
  }
  const check = parts(new Date(result));
  if (
    `${check.year.padStart(4, "0")}-${check.month}-${check.day}` !== date ||
    Number(check.hour) !== hour
  )
    throw new Error("Cette heure ne peut pas être représentée à Paris.");
  return new Date(result).toISOString();
}
export function slotPeriod(date: string, slot: SlotKey): Period {
  const definition = AVAILABILITY_SLOTS.find((s) => s.key === slot)!;
  return {
    start: parisInstant(date, definition.startHour),
    end: parisInstant(
      definition.endHour <= definition.startHour
        ? addCalendarDays(date, 1)
        : date,
      definition.endHour,
    ),
  };
}
export function parisDayPeriod(date: string): Period {
  return {
    start: parisInstant(date, 0),
    end: parisInstant(addCalendarDays(date, 1), 0),
  };
}
function coverage(periods: Period[], target: Period) {
  const start = Date.parse(target.start),
    end = Date.parse(target.end);
  const intervals = periods
    .map((p) => [
      Math.max(start, Date.parse(p.start)),
      Math.min(end, Date.parse(p.end)),
    ])
    .filter(([a, b]) => a < b)
    .sort((a, b) => a[0] - b[0]);
  let through = start;
  for (const [a, b] of intervals) {
    if (a > through) break;
    through = Math.max(through, b);
  }
  return { any: intervals.length > 0, full: through >= end };
}
export function slotStatus(
  target: Period,
  available: Period[],
  unavailable: Period[],
): SlotStatus {
  const no = coverage(unavailable, target);
  if (no.any) return no.full ? "unavailable" : "partial-unavailable";
  const yes = coverage(available, target);
  return yes.full ? "available" : yes.any ? "partial-available" : "unset";
}
export function nextSlotState(status: SlotStatus): AvailabilityState {
  return status === "available"
    ? "unavailable"
    : status === "unavailable"
      ? "unset"
      : "available";
}
export function buildAvailabilityChanges(
  start: string,
  end: string,
  slots: SlotKey[],
  state: AvailabilityState,
): AvailabilityChange[] {
  if (!validDate(start) || !validDate(end) || end < start)
    throw new Error(
      "Choisissez une date de fin égale ou postérieure au début.",
    );
  const unique = [...new Set(slots)];
  if (!unique.length)
    throw new Error(
      "Choisissez au moins un créneau : matin, après-midi ou nuit.",
    );
  const days =
    Math.round(
      (Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) /
        86400000,
    ) + 1;
  if (days * unique.length > 200)
    throw new Error(
      `Cette sélection contient ${days * unique.length} créneaux. La limite est de 200 par enregistrement : réduisez la période ou le nombre de créneaux.`,
    );
  return Array.from({ length: days }, (_, i) =>
    unique.map((slot) => ({
      ...slotPeriod(addCalendarDays(start, i), slot),
      state,
    })),
  ).flat();
}
export function exactParisPeriodLabel(period: Period): string {
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: AVAILABILITY_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${formatter.format(new Date(period.start))} → ${formatter.format(new Date(period.end))} (Paris)`;
}
