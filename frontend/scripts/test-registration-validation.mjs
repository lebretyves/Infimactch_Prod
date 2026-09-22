import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAccount } from '../src/pages/inscription/accountValidation.ts';

const valid = {
  email: 'fixture@example.invalid', motDePasse: 'Fixture-only-123', confirmation: 'Fixture-only-123',
  google: false, interimaire: false, cgu: true, organizationType: 'ESTABLISHMENT',
  nomEtablissement: 'Structure fictive', finess: '010000024', siret: '',
  adresse: '1 rue fictive', codePostal: '75001', villeEtablissement: 'Paris',
  referentPrenom: 'Camille', referentNom: 'Exemple', referentFonction: 'RH', referentTelephone: '0100000000',
};

test('candidate first step requires credentials, not organisation or later identity fields', () => {
  const emptyOrganisation = Object.fromEntries(['nomEtablissement','finess','adresse','codePostal','villeEtablissement','referentPrenom','referentNom','referentFonction','referentTelephone'].map(key => [key, '']));
  assert.deepEqual(validateAccount({...valid, ...emptyOrganisation, interimaire: true, cgu: false}), {});
});

test('password boundaries and confirmation remain enforced for classical accounts', () => {
  for (const length of [11, 129]) assert.equal(validateAccount({...valid, motDePasse: 'x'.repeat(length), confirmation: 'x'.repeat(length)}).motDePasse, 'Entre 12 et 128 caractères.');
  for (const length of [12, 128]) assert.deepEqual(validateAccount({...valid, motDePasse: 'x'.repeat(length), confirmation: 'x'.repeat(length)}), {});
  assert.equal(validateAccount({...valid, confirmation: 'different'}).confirmation, 'Les deux mots de passe diffèrent.');
});

test('Google skips password checks but retains email and enterprise consent validation', () => {
  assert.deepEqual(validateAccount({...valid, google: true, motDePasse: '', confirmation: 'ignored'}), {});
  assert.deepEqual(Object.keys(validateAccount({...valid, google: true, email: 'invalid', cgu: false})), ['email','cgu']);
  assert.deepEqual(validateAccount({...valid, email: '  fixture@example.invalid  '}), {});
});

test('FINESS is required for establishments and preserves Corsican prefix normalization', () => {
  for (const finess of ['010000024', '2A0000001', '2b 0000001']) assert.deepEqual(validateAccount({...valid, finess}), {});
  for (const finess of ['', '12345678', '2C0000001', '1234567890']) assert.equal(validateAccount({...valid, finess}).finess, 'Indiquez un numéro FINESS valide de 9 caractères.');
});

test('agency SIRET remains optional and FINESS does not become an agency prerequisite', () => {
  for (const siret of ['', '12345678901234']) assert.deepEqual(validateAccount({...valid, organizationType: 'AGENCY', finess: '', siret}), {});
  for (const siret of ['123', '1234567890123A', ' 12345678901234']) assert.equal(validateAccount({...valid, organizationType: 'AGENCY', siret}).siret, 'Le SIRET doit contenir 14 chiffres.');
});

test('enterprise errors keep their order and whitespace rules without mutating input', () => {
  const input = {...valid, email: 'invalid', motDePasse: '', confirmation: 'x', cgu: false, nomEtablissement: ' ', finess: '', adresse: ' ', codePostal: '12', villeEtablissement: ' ', referentPrenom: ' ', referentNom: ' ', referentFonction: ' ', referentTelephone: ' '};
  const before = {...input};
  assert.deepEqual(Object.keys(validateAccount(input)), ['email','motDePasse','confirmation','cgu','nomEtablissement','finess','adresse','codePostal','villeEtablissement','referentPrenom','referentNom','referentFonction','referentTelephone']);
  assert.deepEqual(input, before);
  assert.deepEqual(validateAccount({...valid, codePostal: '75 001'}), {});
});
