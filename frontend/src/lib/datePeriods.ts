import type { Period } from '@/services/profile';

function localDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

// The last date is inclusive. Calendar arithmetic also handles daylight saving.
export function wholeDayPeriod(start: string, end: string): Period | null {
  const first = localDate(start), last = localDate(end);
  if (!first || !last || last < first) return null;
  last.setDate(last.getDate() + 1);
  return { start: first.toISOString(), end: last.toISOString() };
}

export function periodLabel(period: Period): string {
  const first = new Date(period.start), end = new Date(period.end);
  const midnight = (d: Date) => d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;
  if (midnight(first) && midnight(end) && end > first) {
    const last = new Date(end);
    last.setDate(last.getDate() - 1);
    const startLabel = first.toLocaleDateString('fr-FR');
    const endLabel = last.toLocaleDateString('fr-FR');
    return startLabel === endLabel ? `${startLabel} — journée entière` : `Du ${startLabel} au ${endLabel} inclus`;
  }
  // Keep the original meaning of existing periods with specific hours.
  return `${first.toLocaleString('fr-FR')} → ${end.toLocaleString('fr-FR')}`;
}
