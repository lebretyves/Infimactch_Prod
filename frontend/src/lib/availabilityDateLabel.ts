/** Date-only summary of an availability interval [start, end), in France. */
export function availabilityDateLabel(period: {
  start: string;
  end: string;
}): string {
  const first = Date.parse(period.start),
    end = Date.parse(period.end);
  if (!Number.isFinite(first) || !Number.isFinite(end) || end <= first)
    return "Dates à vérifier";
  const format = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const startLabel = format.format(first),
    lastLabel = format.format(end - 1);
  return startLabel === lastLabel
    ? startLabel
    : `Du ${startLabel} au ${lastLabel}`;
}
