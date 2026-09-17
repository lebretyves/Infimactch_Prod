import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourceOfferFields,remainingSourcePassages,previewContextOnly} from '../src/lib/parsedOfferSource.ts';
const field=(key,value,text,state='MENTION')=>({key,value,label:key,display:String(value),state,evidence:{origin:'DESCRIPTION',text,start:0,end:text.length}});
test('exact source replaces generated display and duplicate concepts share one passage',()=>{
 const text='Vous assurez la surveillance en cardiologie.';
 const input=[field('specialite','CARDIOLOGIE',text),field('competence','SURVEILLANCE',text)];
 const result=sourceOfferFields(input);assert.equal(result.length,1);assert.equal(result[0].display,text);assert.equal(result[0].label,'Passage de l’annonce');assert.equal(input[0].display,'CARDIOLOGIE');
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
