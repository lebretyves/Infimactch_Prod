export const PAGE_SIZE = 20;
export function pageNumbers(
  current: number,
  last: number,
): (number | string)[] {
  if (last <= 5) return Array.from({ length: last }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(current - 1, last - 3));
  const end = Math.min(last - 1, start + 2);
  return [
    1,
    ...(start > 2 ? ["before"] : []),
    ...Array.from({ length: end - start + 1 }, (_, i) => start + i),
    ...(end < last - 1 ? ["after"] : []),
    last,
  ];
}
export const filterKeys = [
  "q",
  "qualification",
  "includeIde",
  "service",
  "population",
  "block",
  "specialty",
  "shift",
  "establishment",
  "radius",
  "place",
  "lat",
  "lon",
  "start",
  "end",
  "published",
  "available",
] as const;
export type Draft = Record<(typeof filterKeys)[number], string>;
export const fromParams = (p: URLSearchParams) =>
  Object.fromEntries(
    filterKeys.map((k) => [k, (p.get(k) || "").slice(0, 150)]),
  ) as Draft;

export function currentPageFromParams(params: URLSearchParams): number {
  return Math.max(
    1,
    Math.min(501, Math.floor(Number(params.get("page")) || 1)),
  );
}

export function lastPageForTotal(total: number): number {
  return Math.max(1, Math.min(501, Math.ceil(total / PAGE_SIZE)));
}
