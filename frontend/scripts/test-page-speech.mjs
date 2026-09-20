import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localFrenchVoice,prepareSpeechVoices,speakText,stopSpeech} from '../src/services/pageSpeech.ts';
const voice={lang:'fr-FR',localService:true};
function fixture(t,voices=[voice]){
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 const oldWindow=globalThis.window,oldUtterance=globalThis.SpeechSynthesisUtterance;
 const synth=Object.assign(new EventTarget(),{voices,spoken:[],cancels:0,resumes:0,paused:false,speaking:false,pending:false,
  getVoices(){return this.voices;},speak(u){this.spoken.push(u);this.pending=true;},cancel(){this.cancels++;this.speaking=false;this.pending=false;},resume(){this.paused=false;this.resumes++;}});
 globalThis.window=Object.assign(new EventTarget(),{speechSynthesis:synth,SpeechSynthesisUtterance:class{},setTimeout,clearTimeout});
 globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 t.after(()=>{stopSpeech();globalThis.window=oldWindow;globalThis.SpeechSynthesisUtterance=oldUtterance;});return synth;
}
test('late voices are prepared without starting audio, first speak remains synchronous with the next tap',t=>{
 const s=fixture(t,[]),states=[];const clean=prepareSpeechVoices(v=>states.push(v));
 assert.deepEqual(states,['loading']);assert.equal(speakText('Bonjour').ok,false);
 s.voices=[voice];s.dispatchEvent(new Event('voiceschanged'));assert.equal(s.spoken.length,0);assert.equal(states.at(-1),'ready');
 assert.equal(speakText('Bonjour').ok,true);assert.equal(s.spoken.length,1);assert.equal(s.cancels,0);assert.equal(s.spoken[0].voice,voice);clean();
});
test('bounded voice polling also handles engines without voiceschanged and cleans up',t=>{
 const s=fixture(t,[]),states=[];const clean=prepareSpeechVoices(v=>states.push(v));s.voices=[voice];t.mock.timers.tick(250);assert.equal(states.at(-1),'ready');clean();
 s.voices=[];const other=[];const clear=prepareSpeechVoices(v=>other.push(v));t.mock.timers.tick(5000);assert.equal(other.at(-1),'unavailable');clear();s.voices=[voice];s.dispatchEvent(new Event('voiceschanged'));assert.equal(other.at(-1),'unavailable');assert.equal(s.spoken.length,0);
});
test('remote/default voices stay excluded and underscore language tags are supported',t=>{
 const s=fixture(t,[{lang:'fr-FR',localService:false}]);assert.equal(speakText('Texte privé').ok,false);assert.equal(s.spoken.length,0);
 const local={lang:'fr_FR',localService:true};assert.equal(localFrenchVoice([local]),local);
});
test('silent startup reports an error and cancels the queued request, never endless reading',t=>{
 const s=fixture(t),errors=[];speakText('Bonjour',undefined,e=>errors.push(e));t.mock.timers.tick(8000);assert.equal(errors.length,1);assert.match(errors[0],/pas démarré/);assert.equal(s.cancels,1);assert.equal(s.spoken[0].onstart,null);
});
test('onstart clears startup timeout; explicit stop invalidates a saved continuation',t=>{
 const s=fixture(t),errors=[];let started=0;speakText('Bonjour '.repeat(100),undefined,e=>errors.push(e),()=>started++);const first=s.spoken[0];first.onstart();t.mock.timers.tick(9000);assert.equal(started,1);assert.deepEqual(errors,[]);
 first.onend();assert.equal(s.spoken.length,2);const late=s.spoken[1].onend;stopSpeech();late();t.mock.timers.tick(9000);assert.equal(s.spoken.length,2);assert.deepEqual(errors,[]);
});
test('browser denial and synchronous exceptions are reported, paused engine resumes',t=>{
 const s=fixture(t),errors=[];s.paused=true;speakText('Bonjour',undefined,e=>errors.push(e));assert.equal(s.resumes,1);s.spoken[0].onerror({error:'not-allowed'});assert.match(errors[0],/bloqué/);
 s.speak=()=>{throw Error('browser error');};speakText('Bonjour',undefined,e=>errors.push(e));assert.equal(errors.length,2);assert.match(errors[1],/pas démarré/);
});
