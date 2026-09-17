const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
function parts(value: string | Date) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Date invalide.");
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
}
export function parisDateTimeInput(value: string): string {
  if (!value) return "";
  const p = parts(value);
  return `${p.year.padStart(4, "0")}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function parisDateTimeToISO(value: string, original?: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Renseignez la date et l’heure de début et de fin.");
  if (original && parisDateTimeInput(original) === value) return original;
  const wall = Date.parse(value + ":00Z");
  if (
    !Number.isFinite(wall) ||
    new Date(wall).toISOString().slice(0, 16) !== value
  )
    throw new Error("La date ou l’heure renseignée est invalide.");
  const offsets = new Set<number>();
  for (const hours of [-24, 0, 24]) {
    const instant = wall + hours * 3600000;
    const p = parts(new Date(instant));
    const local = Date.parse(
      `${p.year.padStart(4, "0")}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`,
    );
    offsets.add(local - instant);
  }
  const candidates = [...offsets]
    .map((offset) => new Date(wall - offset).toISOString())
    .filter((instant) => parisDateTimeInput(instant) === value);
  if (!candidates.length)
    throw new Error(
      "Cette heure n’existe pas à Paris le jour du passage à l’heure d’été. Choisissez une heure avant 02 h ou à partir de 03 h.",
    );
  if (candidates.length > 1)
    throw new Error(
      "Cette heure apparaît deux fois à Paris le jour du passage à l’heure d’hiver. Choisissez une heure avant 02 h ou à partir de 03 h pour préciser la période.",
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
