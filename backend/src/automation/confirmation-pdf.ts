import PDFDocument from 'pdfkit';

export type ConfirmationDetails = {
  assignmentId: string;
  missionVersion: number;
  missionId?: string;
  establishmentContact?: string;
  population?: string;
  block?: string;
  schedulePrecision?: 'EXACT' | 'DATE';
  title: string;
  qualification: string;
  service?: string;
  address: string;
  start: string | Date;
  end: string | Date;
  timezone?: string;
  hourlySalary: number | string | null;
  professionalName?: string;
  establishmentName?: string;
  agencyName?: string;
  issuedAt?: Date;
  demonstration?: boolean;
  cancellation?: {initiator: 'NURSE' | 'ENTERPRISE'; cancelledAt: string; reason?: string};
};

// Same cross and palette as frontend/src/ui/Logo.tsx and styles/tokens.css.
const cross = 'M16 3.6h8a2.4 2.4 0 0 1 2.4 2.4v7.6H34a2.4 2.4 0 0 1 2.4 2.4v8a2.4 2.4 0 0 1-2.4 2.4h-7.6V34a2.4 2.4 0 0 1-2.4 2.4h-8A2.4 2.4 0 0 1 13.6 34v-7.6H6a2.4 2.4 0 0 1-2.4-2.4v-8A2.4 2.4 0 0 1 6 13.6h7.6V6A2.4 2.4 0 0 1 16 3.6Z';
const color = {blue:'#1466e0', navy:'#0a2540', muted:'#4f6480', teal:'#3bc1ce', pale:'#f1f6fe', sky:'#e3f3f9', line:'#dbe4f0'};
const clean = (text: string) => text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[\u202f\u00a0]/g,' ');

// Plan the complete page before painting: never split a document or silently cut a field.
export function createConfirmationPdf(data: ConfirmationDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    require.resolve('pdfkit/standard-fonts/Helvetica');
    require.resolve('pdfkit/standard-fonts/HelveticaBold');
    const cancelled = !!data.cancellation;
    const documentTitle = cancelled ? 'Annulation d’affectation' : 'Confirmation de mission';
    const doc = new PDFDocument({size:'A4', margins:{top:40,bottom:20,left:42,right:42}, bufferPages:true, tagged:true,
      lang:'fr-FR', displayTitle:true, pdfVersion:'1.7',
      info:{Title:documentTitle+' — InfiMatch', Author:'InfiMatch', Subject:documentTitle, Creator:'InfiMatch'}});
    const chunks:Buffer[]=[];
    doc.on('data', chunk=>chunks.push(chunk));doc.on('error',reject);
    doc.on('end',()=>resolve(Buffer.concat(chunks)));
    const left=42,width=doc.page.width-84, right=left+width;
    const timezone=data.timezone || 'Europe/Paris';
    const value=(input:unknown,fallback='Non renseigné')=>{
      const result=clean(String(input??'')).replace(/\s+/g,' ').trim();
      return result || fallback;
    };
    const date=(input:string|Date,withTime=false)=>clean(new Intl.DateTimeFormat('fr-FR',{
      timeZone:timezone,day:'2-digit',month:'long',year:'numeric',
      ...(withTime?{hour:'2-digit',minute:'2-digit',hourCycle:'h23' as const}:{})
    }).format(new Date(input)));
    const time=(input:string|Date)=>new Intl.DateTimeFormat('fr-FR',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(input));
    const serviceLabels:Record<string,string>={ANESTHESIE:'Anesthésie',CHIRURGIE:'Chirurgie',URGENCES:'Urgences',REANIMATION:'Réanimation',PSYCHIATRIE:'Psychiatrie',SMR:'Soins médicaux et de réadaptation',SOINS_MEDICAUX_ET_READAPTATION:'Soins médicaux et de réadaptation'};
    const service=data.service?(serviceLabels[data.service]||value(data.service).replace(/_/g,' ').toLocaleLowerCase('fr-FR')):'';
    const population=({ADULT:'Adultes',PEDIATRIC:'Pédiatrie',MIXED:'Adultes et pédiatrie'} as Record<string,string>)[data.population||''];
    const block=({GENERAL:'Bloc général',SPECIALIZED:'Bloc spécialisé'} as Record<string,string>)[data.block||''];
    const meta=[data.qualification,service,population,block].filter(Boolean).join(' · ');
    const rawAmount=data.hourlySalary;
    const amount=rawAmount===null||rawAmount===undefined||String(rawAmount).trim()===''?null:Number(rawAmount);
    const salary=amount!==null&&Number.isFinite(amount)?clean(new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(amount)):'Non renseignée';
    const accent=cancelled?'#9a3c23':color.blue, pale=cancelled?'#fff3ed':color.pale;
    const note=cancelled
      ? 'Cette attestation constate l’annulation de l’affectation dans InfiMatch. Elle ne détermine pas les éventuelles conséquences contractuelles ou financières. Le suivi de la mission reste disponible dans votre espace.'
      : 'Cette confirmation récapitule l’affectation enregistrée dans InfiMatch. Elle ne constitue pas un contrat signé. Consultez votre espace pour suivre les modifications ou une éventuelle annulation.';
    function font(size:number,bold=false){return doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size);}
    function measure(text:string,w:number,size:number,bold=false){return font(size,bold).heightOfString(value(text,''),{width:w,lineGap:2});}
    function write(text:string,x:number,y:number,w:number,size:number,bold=false,ink=color.navy,tag='P'){
      font(size,bold).fillColor(ink);
      const content=doc.markStructureContent(tag);
      doc.text(value(text,''),x,y,{width:w,lineGap:2});doc.endMarkedContent();
      doc.addStructure(doc.struct(tag,{},[content]));
    }
    function decoration(draw:()=>void){doc.markContent('Artifact',{type:'Layout'});draw();doc.endMarkedContent();}
    function box(x:number,y:number,w:number,h:number,fill:string,border?:string){decoration(()=>{
      doc.roundedRect(x,y,w,h,9).fill(fill);
      if(border)doc.roundedRect(x,y,w,h,9).lineWidth(.7).strokeColor(border).stroke();
    });}
    // Default body 11.5 pt, then reduce spacing before resorting to a compact body.
    // API maximum lengths are exercised by the PDF regression suite.
    function layout(draw:boolean,body:number,gap:number){
      const label=8.5,small=9.5,pad=13,col=(width-14)/2,compact=gap<10;
      let y=105;
      const out=(t:string,x:number,top:number,w:number,size=body,bold=false,ink=color.navy,tag='P')=>{if(draw)write(t,x,top,w,size,bold,ink,tag);};
      const titleSize=body+(compact?5:7.5),heroHeight=(compact?38:50)+measure(data.title,width-32,titleSize,true)+measure(meta,width-32,small);
      if(draw)box(left,y,width,heroHeight,color.navy);
      out(cancelled?'AFFECTATION ANNULÉE':'AFFECTATION CONFIRMÉE',left+16,y+(compact?8:13),width-32,label,true,'#b9eaf0');
      out(data.title,left+16,y+(compact?22:31),width-32,titleSize,true,'#ffffff','H2');
      out(meta,left+16,y+heroHeight-19-measure(meta,width-32,small)+small,width-32,small,false,'#e0eaf8');
      y+=heroHeight+gap;
      const nurse=value(data.professionalName,'Identité non renseignée');
      const establishment=value(data.establishmentName,'Établissement non renseigné');
      if(compact){
        for(const text of ['Professionnel affecté : '+nurse,'Établissement : '+establishment]){out(text,left,y,width,body,true);y+=measure(text,width,body,true)+4;}
      }else{
      const namesHeight=32+Math.max(measure(nurse,col-2*pad,body+1,true),measure(establishment,col-2*pad,body+1,true));
      if(draw){box(left,y,col,namesHeight,'#ffffff',color.line);box(left+col+14,y,col,namesHeight,'#ffffff',color.line);}
      out('PROFESSIONNEL AFFECTÉ',left+pad,y+11,col-2*pad,label,true,color.muted);
      out(nurse,left+pad,y+26,col-2*pad,body+1,true);
      out('ÉTABLISSEMENT',left+col+14+pad,y+11,col-2*pad,label,true,color.muted);
      out(establishment,left+col+14+pad,y+26,col-2*pad,body+1,true);
      y+=namesHeight+gap*.6;
      }
      for(const [labelText,field] of [['Référent établissement',data.establishmentContact],['Agence',data.agencyName]]){
        if(field){const text=labelText+' : '+value(field);out(text,left,y,width,small,false,color.muted);y+=measure(text,width,small)+4;}
      }
      y+=gap*.5;
      if(gap>=10){out('Le créneau de la mission',left,y,width,body+1,true,color.navy,'H2');y+=body+gap;}
      const datesHeight=compact?59:67;
      if(draw)box(left,y,width,datesHeight,color.pale);
      for(const [x,labelText,instant] of [[left+pad,'DÉBUT',data.start],[left+col+14+pad,'FIN',data.end]] as const){
        out(labelText,x,y+(compact?7:11),col-2*pad,label,true,color.muted);
        out(date(instant),x,y+(compact?22:26),col-2*pad,body,true);
        out(data.schedulePrecision==='DATE'?'Horaires à confirmer':time(instant),x,y+(compact?39:44),col-2*pad,body+1,true);
      }
      y+=datesHeight+6;
      out('Heure locale : '+timezone+' · '+(cancelled?'Créneau libéré dans votre agenda.':'Créneau réservé dans votre agenda.'),left,y,width,small,false,color.muted);
      y+=measure('Heure locale : '+timezone+' · Créneau réservé dans votre agenda.',width,small)+gap;
      out('LIEU DE LA MISSION',left,y,width,label,true,color.muted);y+=14;
      out(value(data.address,'Adresse non renseignée'),left,y,width,body,true);
      y+=measure(value(data.address,'Adresse non renseignée'),width,body,true)+gap;
      const salaryHeight=compact?43:49;
      if(draw)box(left,y,width,salaryHeight,color.sky);
      out(cancelled?'TAUX HORAIRE PRÉVU':'RÉMUNÉRATION HORAIRE',left+pad,y+10,width-26,label,true,color.muted);
      out(salary+(salary==='Non renseignée'?'':' brut / heure'),left+pad,y+25,width-26,body+4,true);
      y+=salaryHeight+gap;
      if(data.cancellation){
        const initiated=data.cancellation.initiator==='NURSE'?'À l’initiative de l’intérimaire':'À l’initiative de l’entreprise';
        const description=initiated+' · '+date(data.cancellation.cancelledAt,true);
        const reason=value(data.cancellation.reason,'Aucun motif communiqué.');
        const h=(compact?33:43)+measure(description,width-26,small)+measure(reason,width-26,body);
        if(draw)box(left,y,width,h,pale);
        out('ANNULATION ENREGISTRÉE',left+pad,y+(compact?7:11),width-26,label,true,accent);
        out(description,left+pad,y+(compact?21:26),width-26,small,false,color.navy);
        out(reason,left+pad,y+(compact?27:33)+measure(description,width-26,small),width-26,body);
        y+=h+gap;
      }
      // Keep the legal nature and identifiers readable, even on long cancellation records.
      const refs=['Référence affectation : '+data.assignmentId+' · Version mission : '+data.missionVersion,...(data.missionId?['Référence mission : '+data.missionId]:[])];
      const refHeight=refs.reduce((sum,t)=>sum+measure(t,width,8.5)+2,0);
      const noteHeight=measure(note,width,small);
      const footerTop=Math.max(y,742-refHeight-noteHeight-15);
      if(draw)decoration(()=>doc.moveTo(left,footerTop).lineTo(right,footerTop).lineWidth(.7).strokeColor(color.line).stroke());
      out(note,left,footerTop+10,width,small,false,color.muted);
      y=footerTop+10+noteHeight+8;
      for(const ref of refs){out(ref,left,y,width,8.5,false,color.muted);y+=measure(ref,width,8.5)+2;}
      return y;
    }
    try {
      let chosen:{body:number;gap:number}|undefined;
      for(const [body,gap] of [[11.5,16],[11.5,10],[11,8],[10,7],[9.5,4]] as const){
        if(layout(false,body,gap)<=775){chosen={body,gap};break;}
      }
      if(!chosen)throw new Error('PDF_CONTENT_EXCEEDS_SINGLE_PAGE');
      decoration(()=>{
        doc.rect(0,0,doc.page.width,5).fill(color.blue);
        doc.save().translate(left,28).scale(.85).path(cross).fill(color.teal).restore();
        doc.save().translate(left,28).scale(.85).rect(20,0,20,40).clip().path(cross).fill(color.blue).restore();
      });
      write('Infi',left+42,36,80,21,true);
      const wordWidth=font(21,true).widthOfString('Infi');write('Match',left+42+wordWidth,36,95,21,true,color.blue);
      write('Émis le '+date(data.issuedAt||new Date()),right-210,35,210,9,false,color.muted);
      write(data.demonstration?'EXEMPLE FICTIF · APERÇU':'DOCUMENT DE SUIVI',right-210,50,210,8.5,true,color.muted);
      write(documentTitle,left,77,width,23,true,color.navy,'H1');
      layout(true,chosen.body,chosen.gap);
      decoration(()=>doc.moveTo(left,791).lineTo(right,791).lineWidth(.7).strokeColor(color.line).stroke());
      write('InfiMatch · '+documentTitle,left,801,width-45,8,false,color.muted);
      write('1 / 1',right-25,801,30,8,false,color.muted);
      if(doc.bufferedPageRange().count!==1)throw new Error('PDF_SINGLE_PAGE_INVARIANT');
      doc.end();
    }catch(error){doc.destroy();reject(error);}
  });
}
