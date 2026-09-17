export type CvPdfItem={str:string;transform:number[];width:number;height:number};
/** Rebuild visual rows independently of the PDF content stream order.
 * Separate columns only when different explicit section headings establish them.
 * Otherwise preserve aligned date/employer columns as rows; no inferred dates/jobs.
 * Complex overlapping/rotated layouts still require review.
 */
export function cvPdfText(items:CvPdfItem[],pageWidth:number){
 const entries=items.filter(i=>i.str.trim()).map(i=>({...i,x:i.transform[4]!,y:i.transform[5]!}));
 const folded=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const headings=entries.filter(i=>/^(?:experiences?(?: professionnelles?)?(?: et stages)?|formations?(?: et diplomes)?|diplomes?|competences|education|work experience|professional experience)\s*:?$/.test(folded(i.str)));
 const positions=headings.map(i=>i.x).sort((a,b)=>a-b);
 let split:number|undefined;
 for(let i=1;i<positions.length;i++)if(positions[i]!-positions[i-1]!>Math.max(100,pageWidth*.25)){split=positions[i]!-8;break;}
 // A heading spanning the proposed gutter means this is one section, not columns.
 if(split!==undefined&&headings.some(i=>i.x<split!&&i.x+i.width>split!+8))split=undefined;
 const columns=split===undefined?[entries]:[entries.filter(i=>i.x<split!),entries.filter(i=>i.x>=split!)];
 return columns.map(column=>{
  const rows:{y:number;height:number;items:typeof entries}[]=[];
  for(const item of [...column].sort((a,b)=>b.y-a.y||a.x-b.x)){
   const row=rows.find(r=>Math.abs(r.y-item.y)<=Math.max(2,Math.min(r.height,item.height)*.25));
   if(row)row.items.push(item);else rows.push({y:item.y,height:item.height,items:[item]});
  }
  return rows.map(row=>row.items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(' ')).join('\n');
 }).join('\n');
}
