import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicationDate,compareRecentExternal} from '../../src/listings/recommendations';
test('recommendation publication dates are explicit instants, never import dates or invented future dates',()=>{
 const now=Date.parse('2036-03-30T12:00:00Z');
 assert.equal(publicationDate('2036-03-30T01:30:00+01:00',now),'2036-03-30T00:30:00.000Z');
 for(const invalid of [null,undefined,'2036-03-30','bad','2037-01-01T00:00:00Z'])assert.equal(publicationDate(invalid,now),null);
});
test('external relevance precedes publication recency without inventing a global score',()=>{
 const items=[{id:'missing',relevance:[0,0,-2],publicationDate:null},{id:'old',relevance:[0,0,-2],publicationDate:'2030-01-01T00:00:00Z'},{id:'recent',relevance:[0,0,-2],publicationDate:'2031-01-01T00:00:00Z'},{id:'incompatible',relevance:[1,0,-3],publicationDate:'2032-01-01T00:00:00Z'}];
 assert.deepEqual(items.sort(compareRecentExternal).map(x=>x.id),['recent','old','missing','incompatible']);
});
