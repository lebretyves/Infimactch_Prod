import test from 'node:test';
import assert from 'node:assert/strict';
import {profileSearchArea, readSearchArea, saveSearchArea, clearSearchAreas} from '../src/lib/searchArea.ts';
const profile = {latitude:48.11, longitude:-1.68, radius_km:30, details:{city:'Nantes',mobilityCity:'Rennes'}};
test('account area uses working city rather than residence', () => {
 assert.deepEqual(profileSearchArea(profile), {place:'Rennes',lat:'48.11',lon:'-1.68',radius:'30'});
 assert.equal(profile.details.city,'Nantes');
});
test('incomplete or invalid account areas are not defaults', () => {
 for (const override of [{latitude:null},{longitude:181},{latitude:NaN},{radius_km:null},{radius_km:0},{radius_km:1001}]) assert.equal(profileSearchArea({...profile,...override}),null);
});
test('legacy coordinates without a city retain a neutral label', () => {
 assert.equal(profileSearchArea({...profile,details:{city:'Nantes'}}).place,'Ma zone enregistr\u00e9e');
});
test('temporary search is isolated per user and does not mutate the account area', () => {
 const values = new Map();
 globalThis.localStorage = {getItem:key=>values.get(key) ?? null,setItem:(key,value)=>values.set(key,value)};
 const temporary={place:'Paris',lat:'48.85',lon:'2.35',radius:'10'};
 saveSearchArea('one',temporary);
 assert.deepEqual(readSearchArea('one'),temporary);
 assert.equal(readSearchArea('two'),null);
 assert.equal(profileSearchArea(profile).place,'Rennes');
 saveSearchArea('one',{place:'',lat:'',lon:'',radius:''});
 assert.deepEqual(readSearchArea('one'),{place:'',lat:'',lon:'',radius:''});
 delete globalThis.localStorage;
});

test('logout cleanup removes all account areas and preserves unrelated preferences', () => {
 const values = new Map([
  ['infimatch:search-area:v1:first', '{}'],
  ['theme', 'dark'],
  ['infimatch:search-area:v1:second', '{}'],
  ['infimatch:search-area:v2:legacy', '{}'],
 ]);
 globalThis.localStorage = {
  get length() { return values.size; },
  key:index=>[...values.keys()][index] ?? null,
  removeItem:key=>values.delete(key),
 };
 try {
  clearSearchAreas();
  assert.deepEqual([...values], [['theme', 'dark']]);
  clearSearchAreas();
  assert.equal(profileSearchArea(profile).place, 'Rennes');
 } finally { delete globalThis.localStorage; }
});

test('blocked browser storage never prevents logout cleanup', () => {
 Object.defineProperty(globalThis, 'localStorage', {configurable:true, get() { throw new Error('blocked'); }});
 try { assert.doesNotThrow(clearSearchAreas); }
 finally { delete globalThis.localStorage; }
});
