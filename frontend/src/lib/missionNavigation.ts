const allowed = new Set(['offset','establishmentId','establishmentName','mode','q','qualification','location','date','status','shift','sort']);
/** Only a local mission-list pathname is accepted; nested redirects and hashes are discarded. */
export function missionReturnTo(value?: string | null): string {
  if (!value || !/^\/missions(?:\?|$)/.test(value) || /[\u0000-\u001f\\]/.test(value)) return '/missions';
  try {
    const url = new URL(value, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid' || url.pathname !== '/missions') return '/missions';
    const params = new URLSearchParams();
    for (const [key, entry] of url.searchParams) if (allowed.has(key) && entry.length <= 500) params.set(key, entry);
    const query = params.toString();
    return '/missions' + (query ? '?' + query : '');
  } catch { return '/missions'; }
}
export function missionPages(current: number, count: number): (number | 'gap')[] {
  const pages = [...new Set([1, count, current-2, current-1, current, current+1, current+2].filter(n => n >= 1 && n <= count))].sort((a,b)=>a-b);
  const result: (number|'gap')[] = [];
  for (const page of pages) {
    const previous = result.at(-1);
    if (typeof previous === 'number' && page - previous > 1) result.push('gap');
    result.push(page);
  }
  return result;
}
