import {test} from 'node:test';
import assert from 'node:assert/strict';
import {googleMapsDirectionsUrl, isGeoPoint, mapsEndpoint} from '../src/lib/commute.ts';

test('geo points reject incomplete or out-of-range coordinates', () => {
  assert.equal(isGeoPoint(null), false);
  assert.equal(isGeoPoint({latitude: 48.85, longitude: null}), false);
  assert.equal(isGeoPoint({latitude: 91, longitude: 2}), false);
  assert.equal(isGeoPoint({latitude: 48.85, longitude: 2.35}), true);
});

test('maps endpoint prefers coordinates and falls back to address', () => {
  assert.deepEqual(
    mapsEndpoint({latitude: 48.85, longitude: 2.35}, 'Paris'),
    {latitude: 48.85, longitude: 2.35},
  );
  assert.deepEqual(
    mapsEndpoint({latitude: null, longitude: null}, '  8 RUE POTERNE DES PEUPLIERS 75013 PARIS  '),
    {address: '8 RUE POTERNE DES PEUPLIERS 75013 PARIS'},
  );
  assert.equal(mapsEndpoint(null, '   '), null);
});

test('Google Maps directions URL encodes origin and destination without an API key', () => {
  const href = googleMapsDirectionsUrl(
    {latitude: 48.85, longitude: 2.35},
    {latitude: 45.75, longitude: 4.85},
  );
  assert.match(href, /^https:\/\/www\.google\.com\/maps\/dir\/\?/);
  assert.match(href, /api=1/);
  assert.match(href, /origin=48\.85%2C2\.35/);
  assert.match(href, /destination=45\.75%2C4\.85/);
  assert.doesNotMatch(href, /key=/i);
});

test('Google Maps directions URL accepts an address destination', () => {
  const href = googleMapsDirectionsUrl(
    {latitude: 48.81, longitude: 2.36},
    {address: '8 RUE POTERNE DES PEUPLIERS 75013 PARIS'},
  );
  assert.match(href, /origin=48\.81%2C2\.36/);
  assert.match(href, /destination=8\+RUE\+POTERNE/);
  assert.doesNotMatch(href, /key=/i);
});
