const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createConfirmationPdf}=require('../backend/dist/automation/confirmation-pdf');
(async()=>{
 const pdfjs=await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs',{paths:[path.join(__dirname,'../frontend')]})).href);
 const sample={assignmentId:'12345678-1234-4567-8901-123456789012',missionVersion:3,title:'IADE — Anesthésie au bloc opératoire',qualification:'IADE',service:'ANESTHESIE',address:'12 avenue de la Santé, 94800 Villejuif',start:'2026-10-12T06:00:00Z',end:'2026-10-12T14:00:00Z',timezone:'Europe/Paris',hourlySalary:'32.50',professionalName:'Camille Martin',establishmentName:'Clinique des Tilleuls',issuedAt:new Date('2026-09-18T10:00:00Z')};
 async function read(input){
  const buffer=await createConfirmationPdf(input);
  assert.equal(buffer.subarray(0,5).toString(),'%PDF-');
  const task=pdfjs.getDocument({data:new Uint8Array(buffer),useSystemFonts:true});
  const pdf=await task.promise;
  const pages=[];
  for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i); const {items}=await page.getTextContent();
   for(const item of items.filter(x=>x.str?.trim())){
    assert.ok(item.transform[5]>=30, 'Text must stay above the bottom page margin: '+item.str);
    assert.ok(item.transform[4]>=40 && item.transform[4]+item.width<=page.view[2]-35,'Text must stay inside horizontal margins: '+item.str);
   }
   pages.push(items.map(x=>x.str||'').join(' '));
  }
  await task.destroy(); return pages;
 }
 const normal=await read(sample);
 assert.equal(normal.length,1);
 for(const expected of ['Infi','Match','Camille Martin','Clinique des Tilleuls','08:00','16:00','32,50','€','Europe/Paris',sample.assignmentId,'contrat signé','1 / 1'])assert.ok(normal[0].includes(expected),expected);
 assert.ok(!normal[0].includes('EXEMPLE FICTIF'));
 const long=await read({...sample,title:'Mission de remplacement en soins médicaux et de réadaptation — Équipe polyvalente de nuit '.repeat(2),address:'Entrée principale du bâtiment des consultations, avenue de la République. '.repeat(5),agencyName:'Agence de démonstration',establishmentName:'Centre hospitalier de démonstration — Pôle soins médicaux et de réadaptation',timezone:'America/Guadeloupe',start:'2026-10-12T22:00:00Z',end:'2026-10-13T10:00:00Z',demonstration:true});
 assert.ok(long.length>=2 && long.length<=3);
 const joined=long.join(' ');
 for(const expected of ['EXEMPLE FICTIF','18:00','06:00','America/Guadeloupe',sample.assignmentId])assert.ok(joined.includes(expected),expected);
 long.forEach((page,i)=>{assert.ok(page.includes(`${i+1} / ${long.length}`));assert.ok(page.length>150,'No empty or footer-only page');});
 const zero=await read({...sample,hourlySalary:0});assert.ok(zero.join(' ').includes('0,00'));
 const missing=await read({...sample,hourlySalary:null,professionalName:undefined,establishmentName:undefined});assert.ok(missing.join(' ').includes('Non renseignée'));
 console.log('PASS: logo text, one-page layout, French accents/euro, local times, long content, margins, pagination and missing/zero rate.');
})().catch(e=>{console.error(e);process.exitCode=1;});
