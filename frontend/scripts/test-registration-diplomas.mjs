import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withIde, diplomaDetails } from '../src/pages/inscription/diplomas.ts';
const years = { ideDiplomaYear: '2015', iadeDiplomaYear: '2020', ibodeDiplomaYear: '2022' };
test('IADE and IBODE select IDE without losing other diplomas', () => {
  assert.deepEqual(withIde(['IADE']), ['IDE', 'IADE']);
  assert.deepEqual(withIde(['IBODE']), ['IDE', 'IBODE']);
  assert.deepEqual(withIde(['IADE', 'IBODE']), ['IDE', 'IADE', 'IBODE']);
  assert.deepEqual(withIde(['IDE', 'IDE', 'IADE']), ['IDE', 'IADE']);
  assert.deepEqual(withIde(['IDE']), ['IDE']);
  assert.deepEqual(withIde([]), []);
});
test('each selected diploma retains its own year; removed diplomas are omitted', () => {
  assert.deepEqual(diplomaDetails(['IDE', 'IADE', 'IBODE'], years), { ideDiplomaYear: 2015, iadeDiplomaYear: 2020, ibodeDiplomaYear: 2022 });
  assert.deepEqual(diplomaDetails(['IDE', 'IBODE'], years), { ideDiplomaYear: 2015, ibodeDiplomaYear: 2022 });
  assert.deepEqual(diplomaDetails(['IDE'], years), { ideDiplomaYear: 2015 });
});
test('missing, future or non-integer years cannot be copied from another diploma', () => {
  for (const value of ['', '1899', String(new Date().getFullYear() + 1), '2015.5', 'Infinity'])
    assert.throws(() => diplomaDetails(['IDE', 'IADE'], { ...years, iadeDiplomaYear: value }), /IADE/);
});
test('specialist year cannot precede IDE but same calendar year is accepted', () => {
  assert.throws(() => diplomaDetails(['IDE', 'IBODE'], { ...years, ibodeDiplomaYear: '2014' }), /précéder/);
  assert.deepEqual(diplomaDetails(['IDE', 'IADE'], { ...years, iadeDiplomaYear: '2015' }), { ideDiplomaYear: 2015, iadeDiplomaYear: 2015 });
});
