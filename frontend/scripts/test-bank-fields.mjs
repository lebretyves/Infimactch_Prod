import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completeBankText,parseBankText,validBic} from '../src/lib/bankFields.ts';
const text='Titulaire: CAMILLE TEST\nIBAN: FR1420041010050500013M02606';
test('OCR completeness accepts a verified IBAN and holder without inventing a missing BIC',()=>{
 assert.equal(completeBankText(text),true);assert.equal(parseBankText(text).bic,'');
 assert.equal(completeBankText('IBAN: FR1420041010050500013M02606'),false);
 assert.equal(completeBankText('Titulaire: CAMILLE TEST\nIBAN: FR1420041010050500013M02607'),false);
});
test('an optional BIC still has to be valid when present',()=>{
 assert.equal(validBic('BNPAFRPPXXX'),true);assert.equal(validBic('BNPAFRPP'),true);
 assert.equal(validBic('INVALID'),false);assert.equal(validBic(''),false);
 assert.equal(parseBankText(text+'\nBIC: BNPAFRPPXXX').bic,'BNPAFRPPXXX');
});
