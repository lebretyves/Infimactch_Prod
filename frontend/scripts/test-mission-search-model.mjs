import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_SIZE, fromParams, currentPageFromParams, lastPageForTotal, pageNumbers } from '../src/pages/missions/searchModel.ts';

test('URL filters preserve encoded values, ignore unrelated parameters and cap input length', () => {
  const params = new URLSearchParams('q=IADE+%26+soins&qualification=IADE&includeIde=1&place=Saint-%C3%89tienne&lat=45.4&lon=4.4&radius=25&start=2026-09-22&end=2026-09-23&page=3&zone=1&origine=externes');
  const draft = fromParams(params);
  assert.equal(draft.q, 'IADE & soins');
  assert.equal(draft.qualification, 'IADE');
  assert.equal(draft.includeIde, '1');
  assert.equal(draft.place, 'Saint-Étienne');
  assert.equal(draft.lat, '45.4');
  assert.equal(draft.lon, '4.4');
  assert.equal(draft.radius, '25');
  assert.equal(draft.start, '2026-09-22');
  assert.equal(draft.end, '2026-09-23');
  assert.equal(draft.service, '');
  for (const key of ['page', 'zone', 'origine']) assert.equal(Object.hasOwn(draft, key), false);
  params.set('q', 'x'.repeat(151));
  assert.equal(fromParams(params).q, 'x'.repeat(150));
  assert.equal(params.get('q').length, 151);
  assert.equal(fromParams(new URLSearchParams('q=first&q=second')).q, 'first');
});

test('page URL coercion keeps the existing 1 to 501 boundary and 20 result offset', () => {
  for (const [value, expected] of [[null, 1], ['', 1], ['invalid', 1], ['0', 1], ['-5', 1], ['2.9', 2], ['501', 501], ['502', 501], ['Infinity', 501], ['-Infinity', 1]]) {
    const params = new URLSearchParams();
    if (value !== null) params.set('page', value);
    assert.equal(currentPageFromParams(params), expected, String(value));
  }
  assert.equal(PAGE_SIZE, 20);
  assert.equal((currentPageFromParams(new URLSearchParams('page=999')) - 1) * PAGE_SIZE, 10000);
});

test('last page covers exact and partial pages and never exceeds the accessible range', () => {
  for (const [total, expected] of [[0, 1], [1, 1], [20, 1], [21, 2], [40, 2], [10000, 500], [10001, 501], [10020, 501], [10021, 501], [Number.MAX_SAFE_INTEGER, 501]]) {
    assert.equal(lastPageForTotal(total), expected, String(total));
  }
});

test('pagination keeps edge pages and ellipses around the current page', () => {
  assert.deepEqual(pageNumbers(1, 1), [1]);
  assert.deepEqual(pageNumbers(3, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageNumbers(1, 8), [1, 2, 3, 4, 'after', 8]);
  assert.deepEqual(pageNumbers(4, 8), [1, 'before', 3, 4, 5, 'after', 8]);
  assert.deepEqual(pageNumbers(8, 8), [1, 'before', 5, 6, 7, 8]);
  assert.deepEqual(pageNumbers(501, 501), [1, 'before', 498, 499, 500, 501]);
});
