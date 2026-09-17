// Intentionally shuffled PDF drawing order: extraction must follow coordinates.
export function positionedCvPdf(entries){
 const stream=entries.map(([x,y,text])=>`BT /F1 12 Tf 1 0 0 1 ${x} ${y} Tm (${text.replace(/[()\\]/g,'\\$&')}) Tj ET`).join('\n');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 800 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let pdf='%PDF-1.4\n';const offsets=[0];for(const [i,object] of objects.entries()){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${object}\nendobj\n`;}
 const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(pdf);
}
export const twoColumnCv=[
 [560,640,'2015 - 2018 Diplome infirmier'],[35,650,'01/2020 - 02/2021'],
 [210,650,'CHU Exemple | Cardiologie'],[560,700,'FORMATION'],
 [35,700,'EXPERIENCES PROFESSIONNELLES'],[210,600,'Clinique Test | Urgences'],
 [35,600,'03/2021 - 04/2022']
];
