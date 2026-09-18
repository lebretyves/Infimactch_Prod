const fs=require('node:fs');
const path=require('node:path');
const {createConfirmationPdf}=require('../backend/dist/automation/confirmation-pdf.js');
const dir=path.resolve(process.argv[2] || '../livrables/confirmation-pdf-refonte');
fs.mkdirSync(dir,{recursive:true});
const sample={assignmentId:'12345678-1234-4567-8901-123456789012',missionVersion:2,title:'IADE — Anesthésie au bloc opératoire',qualification:'IADE',service:'ANESTHESIE',address:'12 avenue de la Santé, 94800 Villejuif',start:'2026-10-12T06:00:00Z',end:'2026-10-12T14:00:00Z',timezone:'Europe/Paris',hourlySalary:'32.50',professionalName:'Camille Martin',establishmentName:'Clinique des Tilleuls',issuedAt:new Date('2026-09-18T10:00:00Z'),demonstration:true};
(async()=>{
 for(const [name,data] of [
 ['confirmation-mission-exemple',sample],
 ['confirmation-mission-longue',{...sample,title:'IDE — Mission de remplacement en soins médicaux et de réadaptation auprès des adultes — Équipe polyvalente de nuit',qualification:'IDE',service:'SOINS_MEDICAUX_ET_READAPTATION',professionalName:'Camille Martin-Dupont',establishmentName:'Centre hospitalier de démonstration — Pôle soins médicaux et de réadaptation',agencyName:'Agence de démonstration InfiMatch',address:'Bâtiment des consultations et hospitalisations, entrée principale côté jardin, 128 avenue de la République, 97110 Pointe-à-Pitre',timezone:'America/Guadeloupe',start:'2026-10-12T22:00:00Z',end:'2026-10-13T10:00:00Z'}]]) {
  const b=await createConfirmationPdf(data);fs.writeFileSync(path.join(dir,name+'.pdf'),b);console.log(name+': '+b.length+' octets');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
