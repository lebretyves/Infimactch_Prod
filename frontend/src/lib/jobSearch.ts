const jobPattern = /\bIBODE\b|\bIADE\b|\bIDE\b|infirmi(?:er|ère|ere)(?:\s+de\s+bloc\s+op[ée]ratoire|\s+anesth[ée]siste|\s+dipl[oô]m[ée](?:e)?\s+d['’][ée]tat)/giu;
export function jobSearch(text: string) {
  const matches = [...text.matchAll(jobPattern)];
  const jobs = [...new Set(matches.map(([value]) => {
    const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    return normalized === 'IBODE' || normalized.includes('BLOC') ? 'IBODE' : normalized === 'IADE' || normalized.includes('ANESTH') ? 'IADE' : 'IDE';
  }))];
  if (jobs.length !== 1) return { qualification: '', keywords: text.trim() };
  return { qualification: jobs[0], keywords: text.replace(jobPattern, ' ').replace(/\s+/g, ' ').trim() };
}
export function changeJobText<T extends {q:string;qualification:string;service:string;population:string;block:string;specialty:string}>(draft:T, q:string, available:string[]):T {
 const before=jobSearch(draft.q), after=jobSearch(q);
 const qualification=available.includes(after.qualification)?after.qualification:before.qualification===draft.qualification?'':draft.qualification;
 return {...draft,q,qualification,...(qualification!==draft.qualification?{service:'',population:'',block:'',specialty:''}:{})};
}
