/** Explicit, local-voice-only reading. Never transmits page text to an app API. */
const MAX_CHARS = 12000;
let generation = 0;
let cleanupPending: (() => void) | undefined;
let activeUtterance: SpeechSynthesisUtterance | undefined;
export const isSpeechSynthesisAvailable = () => typeof window !== "undefined" && !!window.speechSynthesis && "SpeechSynthesisUtterance" in window;
export function localFrenchVoice(voices: SpeechSynthesisVoice[]) {
 return voices.find(v => v.localService === true && /^fr(?:[-_]|$)/i.test(v.lang)) ?? null;
}
export function pageTextForSpeech(): string {
 const main = document.getElementById("contenu") || document.querySelector("main");
 if (!main) return "";
 const parts:string[]=[];
 const walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT);
 let node:Node|null;
 while ((node=walker.nextNode())) {
  const el=node.parentElement;
  if (!el || el.closest("script,style,noscript,svg,[hidden],[aria-hidden='true'],[inert],dialog,input,textarea,select,[contenteditable],[data-no-speech]")) continue;
  if(el.closest("details:not([open])") && !el.closest("summary")) continue;
  const style=getComputedStyle(el);
  if(style.display === "none" || style.visibility !== "visible" || !el.getClientRects().length) continue;
  if(node.textContent?.trim()) parts.push(node.textContent.trim());
 }
 return parts.join(" ").replace(/\s+/g," ").slice(0,MAX_CHARS);
}
export function selectionTextForSpeech() { return (window.getSelection()?.toString().trim() || "").slice(0,MAX_CHARS); }
export const LOCAL_VOICE_HELP = "Aucune voix française locale disponible. Activez ou téléchargez une voix française dans les réglages de synthèse vocale de votre téléphone, puis rouvrez ce panneau.";
export type SpeechVoiceState = "loading" | "ready" | "unavailable";
/** Warm up the voice list without speaking. Never start audio from voiceschanged:
 * a later explicit tap preserves the mobile browser's user activation.
 */
export function prepareSpeechVoices(onChange:(state:SpeechVoiceState)=>void) {
 if(!isSpeechSynthesisAvailable()){onChange("unavailable");return ()=>{};}
 const synth=window.speechSynthesis;
 let interval:ReturnType<typeof setInterval>|undefined;
 let timeout:ReturnType<typeof setTimeout>|undefined;
 const clear=()=>{clearInterval(interval);clearTimeout(timeout);};
 const available=()=>{try{return !!localFrenchVoice(synth.getVoices());}catch{return false;}};
 const changed=()=>{if(available()){clear();onChange("ready");}};
 const ready=available();
 onChange(ready?"ready":"loading");
 synth.addEventListener("voiceschanged",changed);
 if(!ready){
  // Some mobile engines populate voices without dispatching voiceschanged.
  interval=setInterval(changed,250);
  timeout=setTimeout(()=>{clear();onChange(available()?"ready":"unavailable");},5000);
 }
 return ()=>{clear();synth.removeEventListener("voiceschanged",changed);};
}
export function stopSpeech() {
 generation++;
 cleanupPending?.(); cleanupPending=undefined;
 const hadUtterance=!!activeUtterance;
 if(activeUtterance) {activeUtterance.onstart=null;activeUtterance.onend=null;activeUtterance.onerror=null;activeUtterance=undefined;}
 if(isSpeechSynthesisAvailable()) {
  const synth=window.speechSynthesis;
  // Avoid an unnecessary cancel immediately before the first mobile utterance.
  if(hadUtterance||synth.speaking||synth.pending||synth.paused)synth.cancel();
 }
 if(typeof window !== "undefined") window.dispatchEvent(new Event("infimatch:speech-stop"));
}
export function speechErrorMessage(code:string) {
 if(code==="not-allowed")return "Le navigateur a bloqué le démarrage. Appuyez sur Réessayer la lecture pour l’autoriser.";
 if(code==="voice-unavailable"||code==="language-unavailable"||code==="synthesis-unavailable")return LOCAL_VOICE_HELP;
 if(code==="audio-busy"||code==="audio-hardware")return "La sortie audio est indisponible. Vérifiez le volume multimédia et vos écouteurs, puis réessayez.";
 return "La lecture a été interrompue par le navigateur. Vous pouvez réessayer.";
}
export function speakText(text:string, onEnd?:()=>void, onError?:(reason:string)=>void, onStart?:()=>void): {ok:true}|{ok:false;reason:string} {
 if(!isSpeechSynthesisAvailable()) return {ok:false,reason:"Lecture vocale indisponible dans ce navigateur."};
 const cleaned=text.trim().slice(0,MAX_CHARS);
 if(!cleaned) return {ok:false,reason:"Aucun texte visible à lire."};
 stopSpeech();
 const current=generation;
 const synth=window.speechSynthesis;
 let voice:SpeechSynthesisVoice|null;
 try{voice=localFrenchVoice(synth.getVoices());}catch{return {ok:false,reason:LOCAL_VOICE_HELP};}
 if(!voice)return {ok:false,reason:LOCAL_VOICE_HELP};
 const chunks=cleaned.match(/.{1,220}(?:\s|$)|.{1,220}/g) || [cleaned];
 const fail=(reason:string)=>{
  if(current!==generation)return;
  stopSpeech();
  onError?.(reason);
 };
 const next=()=>{
  if(current!==generation)return;
  cleanupPending?.();cleanupPending=undefined;
  if(activeUtterance){activeUtterance.onstart=null;activeUtterance.onend=null;activeUtterance.onerror=null;}
  const chunk=chunks.shift();
  if(!chunk){activeUtterance=undefined;onEnd?.();return;}
  const utterance=new SpeechSynthesisUtterance(chunk);activeUtterance=utterance;
  utterance.voice=voice;utterance.lang=voice.lang.replace('_','-');utterance.rate=1;utterance.volume=1;
  const timer=window.setTimeout(()=>fail("La lecture n’a pas démarré. Vérifiez le volume multimédia, puis appuyez sur Réessayer la lecture."),8000);
  cleanupPending=()=>window.clearTimeout(timer);
  utterance.onstart=()=>{if(current!==generation)return;cleanupPending?.();cleanupPending=undefined;onStart?.();};
  utterance.onend=next;
  utterance.onerror=e=>fail(speechErrorMessage(e.error));
  try{
   if(synth.paused)synth.resume();
   synth.speak(utterance);
  }catch{fail("La lecture n’a pas démarré. Appuyez sur Réessayer la lecture.");}
 };
 next();
 return {ok:true};
}
