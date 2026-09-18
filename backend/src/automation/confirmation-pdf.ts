import PDFDocument from 'pdfkit';

export type ConfirmationDetails = {
  assignmentId: string;
  missionVersion: number;
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
};

// Same cross and palette as frontend/src/ui/Logo.tsx and styles/tokens.css.
const cross = 'M16 3.6h8a2.4 2.4 0 0 1 2.4 2.4v7.6H34a2.4 2.4 0 0 1 2.4 2.4v8a2.4 2.4 0 0 1-2.4 2.4h-7.6V34a2.4 2.4 0 0 1-2.4 2.4h-8A2.4 2.4 0 0 1 13.6 34v-7.6H6a2.4 2.4 0 0 1-2.4-2.4v-8A2.4 2.4 0 0 1 6 13.6h7.6V6A2.4 2.4 0 0 1 16 3.6Z';
const color = {blue:'#1466e0', navy:'#0a2540', muted:'#4f6480', teal:'#3bc1ce', pale:'#f1f6fe', sky:'#e3f3f9', line:'#dbe4f0'};
const clean = (text: string) => text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[\u202f\u00a0]/g,' ');

export function createConfirmationPdf(data: ConfirmationDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Explicit imports keep both standard fonts in the serverless bundle.
    require.resolve('pdfkit/standard-fonts/Helvetica');
    require.resolve('pdfkit/standard-fonts/HelveticaBold');
    const doc = new PDFDocument({size:'A4', margin:42, bufferPages:true,
      info:{Title:'Confirmation de mission — InfiMatch', Author:'InfiMatch', Subject:'Confirmation d’affectation', Creator:'InfiMatch'}});
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    const left=42, width=doc.page.width-84, bottom=756;
    let y=42;
    const timezone=data.timezone || 'Europe/Paris';
    const date=(value:string|Date, withTime=false) => clean(new Intl.DateTimeFormat('fr-FR', {
      timeZone:timezone, day:'2-digit', month:'long', year:'numeric',
      ...(withTime ? {hour:'2-digit',minute:'2-digit',hourCycle:'h23' as const} : {}),
    }).format(new Date(value)));
    function text(value:string,x:number,top:number,w:number,size=11,bold=false,ink=color.navy) {
      doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor(ink)
        .text(clean(value),x,top,{width:w,lineGap:3});
      return doc.y;
    }
    function height(value:string,w:number,size=11,bold=false) {
      return doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size)
        .heightOfString(clean(value),{width:w,lineGap:3});
    }
    function header(continued=false) {
      doc.rect(0,0,doc.page.width,7).fill(color.blue);
      doc.save().translate(left,36).path(cross).fill(color.teal).restore();
      doc.save().translate(left,36).rect(20,0,20,40).clip().path(cross).fill(color.blue).restore();
      text('Infi',left+49,44,100,24,true);
      const wordWidth=doc.font('Helvetica-Bold').fontSize(24).widthOfString('Infi');
      text('Match',left+49+wordWidth,44,130,24,true,color.blue);
      text(continued?'CONFIRMATION · SUITE':'CONFIRMATION DE MISSION',left+285,43,width-285,9,true,color.muted);
      text('Émise le '+date(data.issuedAt || new Date()),left+285,59,width-285,9,false,color.muted);
      y=103;
    }
    function space(required:number) {
      if(y+required>bottom) {doc.addPage();header(true);}
    }
    function heading(number:string,label:string) {
      text(number,left,y,25,10,true,color.blue);
      text(label,left+28,y-2,width-28,15,true);
      y+=28;
    }
    function card(label:string,value:string,extra?:string) {
      const h=36+height(value,width-36,12,true)+(extra?height(extra,width-36,10)+9:0);
      space(h+14);
      doc.roundedRect(left,y,width,h,12).fill(color.pale);
      text(label.toLocaleUpperCase('fr-FR'),left+18,y+13,width-36,8,true,color.muted);
      const end=text(value,left+18,y+30,width-36,12,true);
      if(extra)text(extra,left+18,end+8,width-36,10,false,color.muted);
      y+=h+10;
    }
    header();
    if(data.demonstration) {
      text('EXEMPLE FICTIF · APERÇU DU NOUVEAU MODÈLE',left,y,width,9,true,color.muted);
      y+=22;
    }
    const titleHeight=height(data.title,width-40,21,true);
    const heroHeight=74+titleHeight;
    doc.roundedRect(left,y,width,heroHeight,16).fill(color.blue);
    text('VOTRE AFFECTATION EST CONFIRMÉE',left+20,y+18,width-40,9,true,'#ffffff');
    text(data.title,left+20,y+41,width-40,21,true,'#ffffff');
    text([data.qualification,data.service?.replace(/_/g,' ')].filter(Boolean).join('  /  '),
      left+20,y+heroHeight-25,width-40,10,false,'#ffffff');
    y+=heroHeight+18;

    space(110);
    heading('01','Les participants');
    const gap=16, col=(width-gap)/2;
    const nurse=data.professionalName || 'Intérimaire affecté à la mission';
    const establishment=data.establishmentName || 'Établissement de la mission';
    const participantsHeight=Math.max(height(nurse,col-32,12,true),height(establishment,col-32,12,true))+44;
    for(const [x,label,value] of [[left,'INTÉRIMAIRE',nurse],[left+col+gap,'ÉTABLISSEMENT',establishment]] as const) {
      doc.roundedRect(x,y,col,participantsHeight,12).lineWidth(1).stroke(color.line);
      text(label,x+16,y+13,col-32,8,true,color.muted);
      text(value,x+16,y+32,col-32,12,true);
    }
    y+=participantsHeight+12;
    if(data.agencyName) {
      space(30);
      y=text('Agence : '+data.agencyName,left,y,width,10,false,color.muted)+16;
    }

    space(120);
    heading('02','Votre mission en pratique');
    card('Dates et horaires',date(data.start,true)+' au '+date(data.end,true),
      'Heure locale · '+timezone+' · Créneau réservé dans votre agenda InfiMatch.');
    card('Lieu de la mission',data.address);

    space(115);
    heading('03','Rémunération');
    const amount=data.hourlySalary===null?null:Number(data.hourlySalary);
    const salary=amount!==null && Number.isFinite(amount)
      ? clean(new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(amount))
      : 'Non renseignée';
    doc.roundedRect(left,y,width,72,12).fill(color.sky);
    text(salary,left+18,y+17,width-36,26,true,color.navy);
    text('BRUT / HEURE · TAUX INDIQUÉ POUR LA MISSION',left+18,y+51,width-36,8,true,color.muted);
    y+=84;

    const note='Cette confirmation récapitule l’affectation enregistrée dans InfiMatch. Elle ne constitue pas un contrat signé. En cas de modification ou d’annulation, consultez le statut actualisé de la mission dans votre espace.';
    space(height(note,width,9)+56);
    doc.moveTo(left,y).lineTo(left+width,y).strokeColor(color.line).stroke();
    y=text(note,left,y+14,width,9,false,color.muted)+12;
    text('Référence affectation : '+data.assignmentId+' · Version mission : '+data.missionVersion,
      left,y,width,8,false,color.muted);
    const pages=doc.bufferedPageRange();
    for(let i=0;i<pages.count;i++) {
      doc.switchToPage(i);
      doc.moveTo(left,782).lineTo(left+width,782).strokeColor(color.line).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(color.muted)
        .text('InfiMatch  /  Confirmation de mission',left,795,{lineBreak:false})
        .text(`${i+1} / ${pages.count}`,left+width-30,795,{lineBreak:false});
    }
    doc.end();
  });
}
