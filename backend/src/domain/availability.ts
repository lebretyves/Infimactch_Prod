import { interval, union, type Interval } from "./matching";
export type Availability = { available: Interval[]; unavailable: Interval[] };
export type AvailabilityChange = Interval & {
  state: "available" | "unavailable" | "unset";
};
const periods = (items: [number, number][]): Interval[] =>
  items.map(([start, end]) => ({
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
  }));
/** Half-open intervals: a period ending at 14:00 never conflicts with one starting at 14:00. */
export function subtractPeriods(
  source: Interval[],
  removed: Interval[],
): Interval[] {
  const cuts = union(removed),
    output: [number, number][] = [];
  for (const [start, end] of union(source)) {
    let cursor = start;
    for (const [left, right] of cuts) {
      if (right <= cursor) continue;
      if (left >= end) break;
      if (left > cursor) output.push([cursor, Math.min(left, end)]);
      cursor = Math.max(cursor, right);
      if (cursor >= end) break;
    }
    if (cursor < end) output.push([cursor, end]);
  }
  return periods(output);
}
/** Legacy overlapping declarations are resolved conservatively: unavailability wins. */
export function normalizeAvailability(value: Availability): Availability {
  const unavailable = periods(union(value.unavailable));
  return {
    available: subtractPeriods(value.available, unavailable),
    unavailable,
  };
}
/** Last explicit action wins only inside its interval; surrounding declarations are preserved. */
export function changeAvailability(
  value: Availability,
  changes: AvailabilityChange[],
): Availability {
  let result = normalizeAvailability(value);
  for (const change of changes) {
    interval(change);
    result = {
      available: subtractPeriods(result.available, [change]),
      unavailable: subtractPeriods(result.unavailable, [change]),
    };
    if (change.state !== "unset")
      result[change.state] = periods(union([...result[change.state], change]));
  }
  return result;
}
