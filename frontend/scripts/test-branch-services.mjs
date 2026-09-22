import {test} from 'node:test';
import assert from 'node:assert/strict';
import {externalProvenanceDates} from '../src/services/offer-provenance.ts';
import {defaultAccessibilityPreferences,parseAccessibilityPreferences,storeAccessibilityPreferences,readAccessibilityPreferences,clearAccessibilityPreferences} from '../src/services/accessibilityPreferences.ts';
import {localFrenchVoice} from '../src/services/pageSpeech.ts';
test('source dates retain their semantics; missing or invalid dates are omitted',()=>{
 assert.deepEqual(externalProvenanceDates({}),[]);
 assert.deepEqual(externalProvenanceDates({provenance:{publishedAt:'bad',sourceUpdatedAt:'12'}}),[]);
 const dates=externalProvenanceDates({provenance:{publishedAt:'2026-09-10T10:00:00Z',sourceUpdatedAt:'2026-09-11T10:00:00Z'},imported_at:'2026-09-12T10:00:00Z'});
 assert.equal(dates.length,3);assert.match(dates[0].label,/Publication/);assert.match(dates[2].label,/observation/);assert.equal(dates[2].iso,'2026-09-12T10:00:00.000Z');
});
test('preferences validation, reset, malformed data and unavailable storage',()=>{
 const d=defaultAccessibilityPreferences();assert.deepEqual(parseAccessibilityPreferences(JSON.stringify(d)),d);
 for(const raw of ['{}','null','broken',JSON.stringify({...d,textSize:'huge'}),JSON.stringify({...d,savedAt:'bad'}),JSON.stringify({...d,highContrast:'true'})])assert.equal(parseAccessibilityPreferences(raw),null);
 assert.equal(parseAccessibilityPreferences(JSON.stringify({...d,textSize:'xxlarge'})).textSize,'xxlarge');
 const saved=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('blocked');}});assert.equal(storeAccessibilityPreferences(d).persisted,false);assert.equal(readAccessibilityPreferences().textSize,'normal');assert.equal(clearAccessibilityPreferences(),false);}finally{if(saved)Object.defineProperty(globalThis,'localStorage',saved);else delete globalThis.localStorage;}
});
test('speech never chooses a remote or unspecified voice',()=>{
 assert.equal(localFrenchVoice([{lang:'fr-FR',localService:false},{lang:'en-US',localService:true},{lang:'fr-FR'}]),null);
 const local={lang:'fr-FR',localService:true};assert.equal(localFrenchVoice([{lang:'fr-FR',localService:false},local]),local);
});
