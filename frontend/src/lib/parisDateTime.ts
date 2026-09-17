const formatter = (timeZone: string) => new Intl.DateTimeFormat("en-GB", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
function parts(value: string | Date, timeZone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Date invalide.");
  return Object.fromEntries(
    formatter(timeZone)
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
}
export function zonedDateTimeInput(value: string, timeZone = "Europe/Paris"): string {
  if (!value) return "";
  const p = parts(value, timeZone);
  return `${p.year.padStart(4, "0")}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function zonedDateTimeToISO(value: string, original?: string, timeZone = "Europe/Paris"): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Renseignez la date et l’heure de début et de fin.");
  if (original && zonedDateTimeInput(original, timeZone) === value) return original;
  const wall = Date.parse(value + ":00Z");
  if (
    !Number.isFinite(wall) ||
    new Date(wall).toISOString().slice(0, 16) !== value
  )
    throw new Error("La date ou l’heure renseignée est invalide.");
  const offsets = new Set<number>();
  for (const hours of [-24, 0, 24]) {
    const instant = wall + hours * 3600000;
    const p = parts(new Date(instant), timeZone);
    const local = Date.parse(
      `${p.year.padStart(4, "0")}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`,
    );
    offsets.add(local - instant);
  }
  const candidates = [...offsets]
    .map((offset) => new Date(wall - offset).toISOString())
    .filter((instant) => zonedDateTimeInput(instant, timeZone) === value);
  if (!candidates.length)
    throw new Error(
      "Cette heure n’existe pas dans ce fuseau lors du changement d’heure. Choisissez un autre horaire.",
    );
  if (candidates.length > 1)
    throw new Error(
      "Cette heure apparaît deux fois dans ce fuseau lors du changement d’heure. Choisissez un horaire non ambigu.",
    );
  return candidates[0];
}
export function parisDateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export function nextDate(value: string): string {
  const date = new Date(value + "T12:00:00Z");
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export const parisDateTimeInput = (value: string) => zonedDateTimeInput(value);
export const parisDateTimeToISO = (value: string, original?: string) => zonedDateTimeToISO(value, original);
