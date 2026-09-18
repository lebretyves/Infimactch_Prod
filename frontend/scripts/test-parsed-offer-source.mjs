import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourceOfferFields,remainingSourcePassages,previewContextOnly} from '../src/lib/parsedOfferSource.ts';
const field=(key,value,text,state='MENTION')=>({key,value,label:key,display:String(value),state,evidence:{origin:'DESCRIPTION',text,start:0,end:text.length}});
test('exact source replaces generated display and duplicate concepts share one passage',()=>{
 const text='Vous assurez la surveillance en cardiologie.';
 const input=[field('specialite','CARDIOLOGIE',text),field('competence','SURVEILLANCE',text)];
 const result=sourceOfferFields(input);assert.equal(result.length,1);assert.equal(result[0].display,text);assert.equal(result[0].label,'Activités et soins à réaliser');assert.equal(input[0].display,'CARDIOLOGIE');
 assert.deepEqual(remainingSourcePassages([text,'Autre phrase.','Autre phrase.'],result),['Autre phrase.']);
});
test('old parsed payload clinical transport context does not become a job service',()=>{
 const r=sourceOfferFields([field('service','URGENCES','Transport en urgences des patients victimes d’AVC avec le SAMU.'),field('specialite','CARDIOLOGIE','Notre établissement propose des activités de cardiologie.'),field('service','URGENCES','Vous travaillerez aux urgences.')]);
 assert.equal(r.length,1);assert.equal(r[0].evidence.text,'Vous travaillerez aux urgences.');
});
test('uncertain requirement states are not silently merged into obligatory criteria',()=>{
 const text='Diplôme requis, expérience souhaitée.';const r=sourceOfferFields([field('certification','DIPLOME_INFIRMIER',text,'REQUIRED'),field('experience','EXPERIENCE',text,'DESIRED')]);assert.equal(r[0].state,'REVIEW_REQUIRED');
 assert.equal(sourceOfferFields([field('service','URGENCES','Aux urgences, diplôme requis.','REQUIRED')])[0].state,'MENTION');
});

test('legacy preview rejects the actual AVC transport sentence under service labels',()=>{
 const evidence='Prise en charge des urgences AVC (Alertes thrombolyses) amenés par les pompiers ou le SAMU';
 assert.equal(previewContextOnly({label:'Service',value:'Urgences',evidence}),true);
 assert.equal(previewContextOnly({label:'Services mentionnés',value:'URGENCES',evidence}),true);
 assert.equal(previewContextOnly({label:'Service',value:'Urgences',evidence:'Vous travaillerez aux urgences.'}),false);
});

 test('titles describe the screenshot passages without replacing the source text',()=>{
 const cases=[
  [field('service','SSPI','Infirmier D.E en SSPI (H/F)'), 'Intitulé du poste','post','TITLE'],
  [field('service','SSPI','Vitalis Médical Nîmes recrute un infirmier au cœur d’une clinique Alésienne.'),'Poste et lieu d’exercice','post'],
  [field('service','CHIRURGIE','Cet établissement, implanté dans un environnement urbain, accueille ses services de chirurgie, de médecine et d’ambulatoire.'),'Présentation de l’établissement','context'],
  [field('competence','SURVEILLANCE','Assurer une surveillance active des patients en SSPI, paramètres vitaux et état de conscience.'),'Activités et soins à réaliser','activities'],
  [field('competence','TRANSPORT','FASTT : tarifs préférentiels sur la location de véhicules.'),'Avantages proposés','pay'],
  [field('service','BLOC','Collaborer étroitement avec les équipes médicales et soignantes.'),'Coordination et transmissions','activities'],
 ];
 for(const [f,label,category,origin] of cases){if(origin)f.evidence.origin=origin;const [result]=sourceOfferFields([f]);assert.equal(result.label,label);assert.equal(result.category,category);assert.equal(result.display,f.evidence.text);assert.equal(result.key,f.key);}
 });
 test('pay supplements stay with pay and clinical transport does not become an allowance',()=>{
  assert.equal(sourceOfferFields([field('majoration_horaire',25,'Majoration de nuit : 25 %.')])[0].category,'pay');
  const care=sourceOfferFields([field('activite_transport_sanitaire','TRANSPORT','Assurer le transport médicalisé des patients.')])[0];assert.equal(care.category,'activities');
  assert.equal(sourceOfferFields([field('avantage','LOGEMENT','Logement pris en charge.')])[0].category,'pay');
 });
 test('mixed diploma and experience retain their uncertainty and explicit heading',()=>{
 const text='Diplôme requis, expérience souhaitée.';const input=[field('certification','IDE',text,'REQUIRED'),field('experience_duree',12,text,'DESIRED')];
 const snapshot=JSON.stringify(input),[result]=sourceOfferFields(input);assert.equal(result.label,'Diplômes et expérience');assert.equal(result.state,'REVIEW_REQUIRED');assert.equal(JSON.stringify(input),snapshot);
 });
