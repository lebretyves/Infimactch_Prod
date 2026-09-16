// Additional experimental structured fields. Unknown units stay null.
export function structuredDetails(text: string){
 const s=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const result: any={salaryRanges:[],shiftDurationsHours:[],hourPairs:[]};
 const amount='(?:\\d{1,3}(?:[ \\u00a0]\\d{3})+|\\d+)(?:[.,]\\d+)?';
 const re=new RegExp('('+amount+')\\s*(k)?\\s*(?:€|euros?)?\\s*(?:a|et|-)\\s*('+amount+')\\s*(k)?\\s*(?:€|euros?)?\\s*(bruts?|nets?)?\\s*(?:par\\s+|/\\s*)?(heures?|h\\b|mois|mensuel|annuels?|an\\b)?','gi');
 for(const m of s.matchAll(re)){
  const before=s.slice(Math.max(0,(m.index ?? 0)-65),m.index ?? 0);
  if(!/salaire|remuneration|package|fixe|entre/.test(before)||(!/€|euros|brut|net|annuel|mensuel|mois|\/h/.test(m[0])&&!/salaire|remuneration|package|fixe/.test(before)))continue;
  const number=(v: string | undefined,k: string | undefined)=>Number((v || '').replace(/[ \u00a0]/g,'').replace(',','.'))*(k?1000:1);
  result.salaryRanges.push({min:number(m[1],m[2]),max:number(m[3],m[4]),currency:/€|euros/.test(m[0])?'EUR':null,unit:/annuel|\ban\b/.test(m[6]||'')?'YEAR':/mois|mensuel/.test(m[6]||'')?'MONTH':/heure|^h$/.test(m[6]||'')?'HOUR':null,gross:m[5]?.startsWith('brut')?true:m[5]?.startsWith('net')?false:null,component:/package/.test(before)?'PACKAGE':/fixe/.test(before)?'FIXED':'UNSPECIFIED',evidence:m[0]});
 }
 for(const m of s.matchAll(/(?:mission|poste|horaires?)\s+(?:en|postes?)\s*\(?\s*(\d{1,2})h\s*(?:ou\s*(\d{1,2})h)?/g))result.shiftDurationsHours.push({values:[Number(m[1]),...(m[2]?[Number(m[2])]:[])],evidence:m[0]});
 for(const m of s.matchAll(/\b([01]?\d|2[0-3])\s*h\s*([0-5]\d)?\s*(?:-|–|a)\s*([01]?\d|2[0-3])\s*h\s*([0-5]\d)?\b/g))result.hourPairs.push({start:m[1]!.padStart(2,'0')+':'+(m[2]||'00'),end:m[3]!.padStart(2,'0')+':'+(m[4]||'00'),state:'AMPLITUDE_OR_SHIFT_TO_CONFIRM',evidence:m[0]});
 return result;
}
