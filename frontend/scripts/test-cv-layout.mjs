import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cvPdfText} from '../src/lib/cvPdfText.ts';
import {twoColumnCv} from './cv-pdf-fixture.mjs';
const item=([x,y,str])=>({str,transform:[12,0,0,12,x,y],width:str.length*6,height:12});
test('visual rows reconstruct date/employer pairs and keep education column separate',()=>{
 const text=cvPdfText(twoColumnCv.map(item),800);
 assert.equal(text,'EXPERIENCES PROFESSIONNELLES\n01/2020 - 02/2021 CHU Exemple | Cardiologie\n03/2021 - 04/2022 Clinique Test | Urgences\nFORMATION\n2015 - 2018 Diplome infirmier');
});
test('unlabelled date column stays paired and vertically separated date fragments stay separate',()=>{
 const text=cvPdfText([[180,600,'CHU Exemple'],[35,620,'Janvier'],[35,600,'2020 -'],[35,580,'Mars 2021']].map(item),800);
 assert.equal(text,'Janvier\n2020 - CHU Exemple\nMars 2021');
});
