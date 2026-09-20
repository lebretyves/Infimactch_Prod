/** Explicit, local-voice-only reading. Never transmits page text to an app API. */
const MAX_CHARS = 12000;
let generation = 0;
let cleanupPending: (() => void) | undefined;
let activeUtterance: SpeechSynthesisUtterance | undefined;
export const isSpeechSynthesisAvailable = () => typeof window !== "undefined" && !!window.speechSynthesis && "SpeechSynthesisUtterance" in window;
export function localFrenchVoice(voices: SpeechSynthesisVoice[]) {
 return voices.find(v => v.localService === true && /^fr(?:-|$)/i.test(v.lang)) ?? null;
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
export function stopSpeech() {
 generation++;
 cleanupPending?.(); cleanupPending=undefined;
 if(activeUtterance) {activeUtterance.onend=null;activeUtterance.onerror=null;activeUtterance=undefined;}
 if(isSpeechSynthesisAvailable()) window.speechSynthesis.cancel();
 if(typeof window !== "undefined") window.dispatchEvent(new Event("infimatch:speech-stop"));
}
export function speakText(text:string, onEnd?:()=>void, onError?:(reason:string)=>void): {ok:true}|{ok:false;reason:string} {
 if(!isSpeechSynthesisAvailable()) return {ok:false,reason:"Lecture vocale indisponible dans ce navigateur."};
 const cleaned=text.trim().slice(0,MAX_CHARS);
 if(!cleaned) return {ok:false,reason:"Aucun texte visible à lire."};
 stopSpeech();
 const current=generation;
 const synth=window.speechSynthesis;
 const unavailable="Aucune voix française locale disponible. Activez une voix dans les paramètres de votre appareil ou utilisez votre lecteur d’écran.";
 const start=(voice:SpeechSynthesisVoice)=>{
  if(current!==generation) return;
  cleanupPending?.();cleanupPending=undefined;
  // Short chunks avoid the browser truncating long pages. Stop cancels the chain.
  const chunks=cleaned.match(/.{1,220}(?:\s|$)|.{1,220}/g) || [cleaned];
  const next=()=>{
   if(current!==generation)return;
   const chunk=chunks.shift();
   if(!chunk){activeUtterance=undefined;onEnd?.();return;}
   const utterance=new SpeechSynthesisUtterance(chunk); activeUtterance=utterance;
   utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=1;
   utterance.onend=next;
   utterance.onerror=()=>{if(current===generation){activeUtterance=undefined;onError?.("La lecture a été interrompue par le navigateur.");}};
   synth.speak(utterance);
  };
  next();
 };
 const voice=localFrenchVoice(synth.getVoices());
 if(voice){start(voice);return {ok:true};}
 // Do not select a remote/default voice if local voices have not loaded yet.
 const changed=()=>{const v=localFrenchVoice(synth.getVoices());if(v)start(v);};
 const timeout=window.setTimeout(()=>{cleanupPending?.();cleanupPending=undefined;if(current===generation)onError?.(unavailable);},3000);
 cleanupPending=()=>{window.clearTimeout(timeout);synth.removeEventListener("voiceschanged",changed);};
 synth.addEventListener("voiceschanged",changed);
 return {ok:true};
}
