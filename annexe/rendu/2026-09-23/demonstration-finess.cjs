// Reuse the application's actual FINESS normalization; no database or network access.
const {normalizeFiness}=require('../../../backend/dist/reference-data/finess.js');
const {writeFileSync}=require('node:fs');
const {join}=require('node:path');
const assert=require('node:assert/strict');
const before={generatedAt:'2026-09-01T00:00:00Z',pmej:[{informationsGeneralesPMEJ:{numFinessPm:'010000001'},ege:[
 {informationsGeneralesEGE:{numFinessEge:'010000002',nomEgeLong:'  Etablissement FICTIF de demonstration  '},etatObjet:'A',adresse:[{ligneQuatre:'  10 rue EXEMPLE  ',codePostal:'01000',ligneAcheminement:'  VILLE FICTIVE  ',coordonneesGeographique:{directionLongitude:'5.24',directionLatitude:'46.20'}}]},
 {informationsGeneralesEGE:{numFinessEge:'2A0000001',nomEgeCourt:'FICTIF sans coordonnees'},etatObjet:'F',adresse:[{coordonneesGeographique:{coordonneeX:'872835',coordonneeY:'6569568'}}]}
]}]};
const after=normalizeFiness(before);
assert.equal(after[0].finess,'010000002');
assert.equal(after[0].name,'Etablissement FICTIF de demonstration');
assert.equal(after[0].longitude,5.24);
assert.equal(after[1].finess,'2A0000001');
assert.equal(after[1].longitude,null);
assert.equal(after[1].status,'F');
const duplicate=structuredClone(before);duplicate.pmej[0].ege.push(duplicate.pmej[0].ege[0]);
assert.throws(()=>normalizeFiness(duplicate),/duplicate FINESS/);
const result={scope:'Synthetic illustration, not a downloaded public extract',normalizer:'backend/src/reference-data/finess.ts#normalizeFiness',before,after,checks:{leadingZero:true,corsicanId:true,trim:true,degreeCoordinates:true,projectedCoordinatesRejected:true,closedStatusRetained:true,duplicateRejected:true}};
writeFileSync(join(__dirname,'demonstration-finess-resultat.json'),JSON.stringify(result,null,2)+'\n');
console.log('PASS: seven normalization checks; two synthetic records; no database write or network access.');

