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
  assert.equal(pdf.numPages,1,'Every confirmation and cancellation must fit one page');assert.equal((await pdf.getMetadata()).info.Language,'fr-FR');await task.destroy(); return pages;
 }
 const normal=await read(sample);
 assert.equal(normal.length,1);
 for(const expected of ['Infi','Match','Camille Martin','Clinique des Tilleuls','08:00','16:00','32,50','€','Europe/Paris',sample.assignmentId,'contrat signé','1 / 1'])assert.ok(normal[0].includes(expected),expected);
 assert.ok(!normal[0].includes('EXEMPLE FICTIF'));
 const long=await read({...sample,title:'Mission de remplacement en soins médicaux et de réadaptation — Équipe polyvalente de nuit '.repeat(2),address:'Entrée principale du bâtiment des consultations, avenue de la République. '.repeat(5),agencyName:'Agence de démonstration',establishmentName:'Centre hospitalier de démonstration — Pôle soins médicaux et de réadaptation',timezone:'America/Guadeloupe',start:'2026-10-12T22:00:00Z',end:'2026-10-13T10:00:00Z',demonstration:true});
 assert.equal(long.length,1);
 const joined=long.join(' ');
 for(const expected of ['EXEMPLE FICTIF','18:00','06:00','America/Guadeloupe',sample.assignmentId])assert.ok(joined.includes(expected),expected);
 long.forEach((page,i)=>{assert.ok(page.includes(`${i+1} / ${long.length}`));assert.ok(page.length>150,'No empty or footer-only page');});
 const zero=await read({...sample,hourlySalary:0});assert.ok(zero.join(' ').includes('0,00'));
 const missing=await read({...sample,hourlySalary:null,professionalName:undefined,establishmentName:undefined});assert.ok(missing.join(' ').includes('Non renseignée'));
 const cancelled=await read({...sample,cancellation:{initiator:'NURSE',cancelledAt:'2026-09-18T12:00:00Z'}});
 const cancelledText=cancelled.join(' ');
 for(const expected of ['Annulation d’affectation','AFFECTATION ANNULÉE','Créneau libéré','initiative de l’intérimaire',sample.assignmentId])assert.ok(cancelledText.includes(expected),expected);
 assert.ok(!cancelledText.includes('AFFECTATION EST CONFIRMÉE'));
 assert.ok(!cancelledText.includes('Créneau réservé'));
 const companyCancellation=(await read({...sample,cancellation:{initiator:'ENTERPRISE',cancelledAt:'2026-09-18T12:00:00Z'}})).join(' ');
 assert.ok(companyCancellation.includes('initiative de l’entreprise'));
 const worst={...sample,service:'SERVICE_'.repeat(10),title:'Mission polyvalente en établissement spécialisé '.repeat(4).slice(0,150),professionalName:'Camille Alexandra '.repeat(12).slice(0,201),establishmentName:'Centre hospitalier universitaire '.repeat(5).slice(0,150),establishmentContact:'Madame Responsable des équipes '.repeat(5).slice(0,150),agencyName:'Agence régionale de remplacement '.repeat(5).slice(0,150),address:'Entrée des consultations, bâtiment B côté jardin, avenue de la République. '.repeat(8).slice(0,500),missionId:'87654321-4321-4321-8321-123456789012',population:'MIXED',block:'SPECIALIZED',cancellation:{initiator:'ENTERPRISE',cancelledAt:'2026-09-18T12:00:00Z',reason:'Réorganisation communiquée par le service ; merci de consulter votre suivi. '.repeat(7).slice(0,500)}};
 const worstText=(await read(worst)).join(' ');for(const field of [worst.title,worst.professionalName,worst.establishmentName,worst.establishmentContact,worst.agencyName,worst.address,worst.cancellation.reason])assert.ok(worstText.replace(/\s/g,'').includes(field.replace(/\s/g,'')),'Long fields must remain complete');assert.ok(worstText.includes(worst.missionId));assert.ok(worstText.includes('TAUX HORAIRE PRÉVU'));assert.ok(worstText.includes('32,50'));assert.ok(worstText.includes(worst.cancellation.reason.slice(-25).trim()));
 const dateOnly=(await read({...sample,schedulePrecision:'DATE',start:'2026-10-12T00:00:00Z',end:'2026-10-13T00:00:00Z'})).join(' ');assert.ok(dateOnly.includes('Horaires à confirmer'));assert.ok(!dateOnly.includes('02:00'));
 console.log('PASS: logo text, one-page layout, French accents/euro, local times, long content, margins, pagination and missing/zero rate.');
})().catch(e=>{console.error(e);process.exitCode=1;});
