import test from 'node:test';import assert from 'node:assert/strict';import {filterGuides,helpGuides} from '../src/data/helpGuides.ts';
test('help search ignores accents and combines terms',()=>{assert.ok(filterGuides('diplomes', 'NURSE').some(g=>g.id==='inscription'));assert.equal(filterGuides('mot passe', 'ALL')[0].id,'connexion');assert.equal(filterGuides('inexistantxyz','ALL').length,0);});
test('help guides respect roles while retaining public connection assistance',()=>{for(const role of ['NURSE','ESTABLISHMENT','AGENCY','ADMIN'])assert.ok(filterGuides('',role).some(g=>g.id==='connexion'));assert.ok(!filterGuides('','NURSE').some(g=>g.id==='admin'));assert.ok(filterGuides('','ADMIN').some(g=>g.id==='admin'));assert.equal(new Set(helpGuides.map(g=>g.id)).size,helpGuides.length);});

import fs from 'node:fs';
import {helpTutorials} from '../src/data/helpTutorials.ts';
test('six tutorials have complete local media or an HTTPS external link and written alternatives',()=>{
 assert.equal(helpTutorials.length,6);assert.equal(new Set(helpTutorials.map(t=>t.id)).size,6);
 for(const tutorial of helpTutorials){assert.ok(tutorial.steps.length>=3);assert.ok(tutorial.roles.length);if(tutorial.media.kind==='external'){const url=new URL(tutorial.media.url);assert.equal(url.protocol,'https:');assert.equal(url.username+url.password,'');continue;}for(const key of ['src','poster','captions'])assert.ok(fs.statSync(new URL('../public'+tutorial.media[key],import.meta.url)).size>0);assert.ok(fs.statSync(new URL('../public'+tutorial.media.src,import.meta.url)).size>10000);assert.match(fs.readFileSync(new URL('../public'+tutorial.media.captions,import.meta.url),'utf8'),/^WEBVTT[\s\S]* --> /);}
});
test('PDF, email and incomplete matching troubleshooting is available to both sides',()=>{
 for(const role of ['NURSE','ESTABLISHMENT','AGENCY'])for(const id of ['pdf-manquant','email-manquant','matching-incomplet'])assert.ok(filterGuides('',role).some(g=>g.id===id),role+' '+id);
});
