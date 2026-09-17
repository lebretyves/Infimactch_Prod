import { api } from "./api";
export type Assignment = {
  id: string;
  mission_id: string;
  title: string;
  status: string;
  start_at: string;
  end_at: string;
  temporal_position: string;
};
export async function allPages<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += 50) {
    const page = await api<T[]>(`${path}?limit=50&offset=${offset}`, {
      signal,
    });
    result.push(...page);
    if (page.length < 50) return result;
  }
}
export const allHistory = (signal?: AbortSignal) =>
  allPages<Assignment>("/me/history", signal);
export function dateInput(value: string | Date) {
  const d = new Date(value);
  return Number.isFinite(d.getTime())
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "";
}
