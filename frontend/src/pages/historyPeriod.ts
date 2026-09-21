type Dates = { start_at: string; end_at: string };
const paris = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" });
function monthIndex(value: string | number): number {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return NaN;
  const parts = paris.formatToParts(date);
  return Number(parts.find(p => p.type === "year")?.value) * 12 + Number(parts.find(p => p.type === "month")?.value) - 1;
}
function interval(item: Dates): [number, number] {
  const start = Date.parse(item.start_at), end = Date.parse(item.end_at);
  // A mission ending at midnight does not occupy the following month.
  return [monthIndex(start), monthIndex(end > start ? end - 1 : end)];
}
export function historyYears(items: Dates[], now = new Date()): string[] {
  const years = new Set([Math.floor(monthIndex(now.toISOString()) / 12)]);
  for (const item of items) {
    const [start, end] = interval(item);
    for (let year = Math.floor(start / 12); year <= Math.floor(end / 12); year++) years.add(year);
  }
  return [...years].sort((a, b) => b - a).map(String);
}
export function inHistoryPeriod(item: Dates, month: string, year: string): boolean {
  if (!month && !year) return true;
  const [start, end] = interval(item);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return false;
  if (year) {
    const first = Number(year) * 12 + (month ? Number(month) - 1 : 0);
    const last = month ? first : first + 11;
    return start <= last && end >= first;
  }
  const candidate = Math.floor(start / 12) * 12 + Number(month) - 1;
  return (candidate < start ? candidate + 12 : candidate) <= end;
}
export const historyMonths = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, index, 1))),
}));
