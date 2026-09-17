import {ideServices} from '../reference-data/reference-data.module';
export type CvExperience={establishment:string;service:string;startDate:string;endDate:string;periodLabel:string;evidence:string;warnings:string[]};
const fold=(s:string)=>s.replace(/[’‘]/g,"'").normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const monthNames=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
const monthAliases=[['jan','janv','january'],['fev','fevr','feb','february'],['mar','march'],['avr','apr','april'],['may'],['jun','june'],['jul','juil','juill','july'],['aou','aug','august'],['sep','sept','september'],['oct','october'],['nov','november'],['dec','december']];
const months=monthNames.flatMap((m,i)=>[m,...monthAliases[i]!]).sort((a,b)=>b.length-a.length).join('|');
const dateToken=String.raw`(?:\d{1,2}[/.-]\d{1,2}[/.-](?:19|20)\d{2}|(?:19|20)\d{2}[-/]\d{2}[-/]\d{2}|(?:19|20)\d{2}[-/]\d{2}|\d{1,2}[/.-](?:19|20)\d{2}|(?:\d{1,2}(?:er)?\s+)?(?:${months})\.?\s+(?:19|20)\d{2}|(?:19|20)\d{2})`;
const range=new RegExp(`(?<![\\d/.-])(${dateToken})\\s*(?:-|–|—|→|−|‑|\\bau\\b|\\ba\\b|\\bto\\b|\\bjusqu'au\\b)\\s*(${dateToken}|aujourd'hui|present|actuel(?:lement)?|en cours|a ce jour|current)(?![\\d/.-])`,'i');
function parsedDate(raw:string,last:boolean){
 let year=0,month=0,day=0,precision='day';const text=fold(raw).replace(/\.$/,'');let m;
 if((m=text.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/))){year=+m[1]!;month=+m[2]!;day=+m[3]!;}
 else if((m=text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))){year=+m[3]!;month=+m[2]!;day=+m[1]!;}
 else if((m=text.match(/^(\d{1,2})[/.-](\d{4})$/))){year=+m[2]!;month=+m[1]!;precision='month';}
 else if((m=text.match(/^(\d{4})[-/](\d{2})$/))){year=+m[1]!;month=+m[2]!;precision='month';}
 else if((m=text.match(/^(?:(\d{1,2})(?:er)?\s+)?([a-z]+)\.?\s+(\d{4})$/))){year=+m[3]!;month=monthNames.findIndex((name,i)=>name===m![2]||monthAliases[i]!.includes(m![2]!))+1;day=m[1]?+m[1]:0;precision=m[1]?'day':'month';}
 else if(/^\d{4}$/.test(text)){year=+text;month=last?12:1;precision='year';}
 else return {date:'',precision:'unknown'};
 if(precision==='day'&&day===0)return {date:'',precision:'unknown'};
 if(!day)day=last?new Date(Date.UTC(year,month,0)).getUTCDate():1;
 const d=new Date(Date.UTC(year,month-1,day));if(year<1900||month<1||month>12||d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)return {date:'',precision:'unknown'};
 return {date:d.toISOString().slice(0,10),precision};
}
const stopHeading=/^(?:formations?(?: et diplomes)?|diplomes?(?: et formations)?|education|competences(?: techniques)?|skills|langues|languages|centres? d.interet|interests|references)\s*:?$/i;
const workHeading=/^(?:experiences?(?: professionnelles?)?(?: et stages)?|parcours professionnel|activites? professionnelles?|emplois? occupes?|professional experience|work experience|employment history)\s*:?$/i;
function serviceFor(text:string){const normalized=fold(text).replace(/[^a-z0-9]+/g,' ');const matches=ideServices.filter(code=>code!=='AUTRE'&&new RegExp('(?:^| )'+fold(code).replaceAll('_',' ')+'(?: |$)').test(normalized));
 if(matches.includes('PEDOPSYCHIATRIE'))return 'PEDOPSYCHIATRIE';
 if(matches.includes('CHIRURGIE_AMBULATOIRE'))return 'CHIRURGIE_AMBULATOIRE';
 if(matches.length===1)return matches[0]!;
 if(!matches.length&&/\b(?:ssr|soins de suite)\b/.test(normalized))return 'SMR';return '';
}
export function parseCvExperience(text:string,now=new Date()){
 // PDF text items and OCR often split a printed date or range across lines.
 // Join only date-shaped fragments; never jump across employer/section text.
 const normalizedText=text.replace(/\r/g,'').replace(/[\u00a0\u202f]/g,' ').replace(/(\d)\s*([/.])\s*(?=\d)/g,'$1$2');
 const rawLines=normalizedText.split('\n').map(s=>s.trim()).filter(Boolean);
 const dateFragment=new RegExp(`^(?:(?:du|de|depuis)\\s+)?(?:${dateToken}|(?:${months})\\.?)(?:\\s*(?:-|–|—|−|‑|a|au|to))?$`,'i');
 const connector=/^(?:-|–|—|−|‑|a|au|to)$/i;
 const lines:string[]=[];
 for(let i=0;i<rawLines.length;i++){
  let line=rawLines[i]!,candidateLine=line;
  if(!range.test(fold(line))&&dateFragment.test(fold(line))){
   for(let extra=1;extra<=4&&i+extra<rawLines.length;extra++){
    const next=rawLines[i+extra]!;const candidate=candidateLine+' '+next;
    const matched=fold(candidate).match(range);
    if(matched&&/^(?:(?:du|de)\s+)?$/.test(fold(candidate).slice(0,matched.index))){line=candidate;i+=extra;break;}
    if(!dateFragment.test(fold(next))&&!connector.test(fold(next)))break;
    candidateLine=candidate;
   }
  }
  lines.push(line);
 }const warnings:string[]=[];const experiences:CvExperience[]=[];
 const hasWorkSection=lines.some(s=>workHeading.test(fold(s)));let active=!hasWorkSection;let section:string[]=[];
 function consume(){
  const found=section.map((line,index)=>({line,index,match:fold(line).match(range)})).filter(x=>x.match);
  const trailing=found.length>0&&found[0]!.index>0&&/\b(chu?|hopital|clinique|ehpad|centre hospitalier|hospital|infirmier|nurse)\b/.test(fold(section.slice(Math.max(0,found[0]!.index-2),found[0]!.index).join(' ')));
  for(let n=0;n<found.length&&experiences.length<50;n++){
   const item=found[n]!,m=item.match!;
   const start=parsedDate(m[1]!,false),end=parsedDate(m[2]!,true);
   const first=trailing?(n?found[n-1]!.index+1:0):item.index;
   const last=trailing?item.index+1:(found[n+1]?.index??section.length);
   const block=section.slice(first,Math.min(last,first+10));const evidence=block.join('\n').slice(0,1500);const notes:string[]=[];
   if(!end.date){warnings.push('Une période en cours ou illisible n’a pas été ajoutée : '+m[0]);continue;}
   if(!start.date||end.date<start.date||end.date>=now.toISOString().slice(0,10)){warnings.push('Une période incohérente ou non terminée reste à saisir manuellement : '+m[0]);continue;}
   if(start.precision!=='day'||end.precision!=='day')notes.push('Dates approximatives : début et fin de mois ou d’année proposés. Confirmez les dates exactes.');
   const employerLine=block.find(l=>/\b(?:chu?|chr|hopital|clinique|ehpad|centre hospitalier|hospital|maison de retraite)\b/.test(fold(l)))||'';
   const periodInEmployer=fold(employerLine).match(range);
   const employerWithoutPeriod=periodInEmployer?employerLine.slice(0,periodInEmployer.index)+employerLine.slice((periodInEmployer.index??0)+periodInEmployer[0].length):employerLine;
   const employer=employerWithoutPeriod.split(/\s+[|;–—]\s+|\s+-\s+/).find(part=>/\b(?:chu?|chr|hopital|clinique|ehpad|centre hospitalier|hospital|maison de retraite)\b/.test(fold(part)))?.trim().slice(0,150)||'';
   const service=serviceFor(evidence);if(!service)notes.push('Service absent ou ambigu : choisissez le service concerné.');if(!employer)notes.push('Établissement non reconnu : complétez-le si nécessaire.');
   experiences.push({establishment:employer,service,startDate:start.date,endDate:end.date,periodLabel:m[0],evidence,warnings:notes});
  }
  section=[];
 }
 for(const line of lines){const normalized=fold(line);if(workHeading.test(normalized)){consume();active=true;continue;}if(stopHeading.test(normalized)){consume();active=false;continue;}if(active)section.push(line);}
 consume();
 const seen=new Set<string>();const unique=experiences.filter(e=>{const key=JSON.stringify([fold(e.establishment),e.service,e.startDate,e.endDate,e.evidence]);if(seen.has(key))return false;seen.add(key);return true;});
 if(!unique.length)warnings.push('Le texte du CV a été lu, mais aucune expérience passée avec des dates de début et de fin exploitables n’a été reconnue. Vérifiez les périodes et la mise en page du document ; vous pouvez saisir les expériences manuellement.');
 if(lines.some(line=>/\bdepuis\s+(?:\d|jan|fev|mar|avr|mai|juin|juil|aou|sep|oct|nov|dec)/.test(fold(line))))warnings.push('Une expérience indiquée « depuis » est en cours : elle ne peut pas être ajoutée comme expérience terminée sans date de fin confirmée.');
 return {experiences:unique,warnings,method:'RULES_V1',requiresReview:true};
}
