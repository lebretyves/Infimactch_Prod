import {test} from 'node:test';import assert from 'node:assert/strict';
import {structuredDetails as p} from './structured-details.mjs';
test('fourchette mensuelle conserve milliers',()=>{const r=p('Salaire entre 2 220€ et 2 400€ par mois').salaryRanges[0];assert.equal(r.min,2220);assert.equal(r.max,2400);assert.equal(r.unit,'MONTH');});
test('fourchette horaire partage symbole et unite',()=>{const r=p('Salaire compris entre 21 et 23€/h').salaryRanges[0];assert.equal(r.min,21);assert.equal(r.max,23);assert.equal(r.unit,'HOUR');});
test('montant sans periode ne devient pas annuel',()=>assert.equal(p('Salaire entre 25k et 28k bruts').salaryRanges[0].unit,null));
test('durees alternatives distinctes horaires',()=>assert.deepEqual(p('MISSION EN 10H OU 12H').shiftDurationsHours[0].values,[10,12]));
test('plage nuit conserve bornes sans calculer duree payee',()=>{const r=p('horaires 19h-7h').hourPairs[0];assert.equal(r.start,'19:00');assert.equal(r.end,'07:00');});
