import { useEffect, useRef, useState } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { LOCAL_VOICE_HELP, prepareSpeechVoices, type SpeechVoiceState, isSpeechSynthesisAvailable, pageTextForSpeech, selectionTextForSpeech, speakText, stopSpeech } from "@/services/pageSpeech";
import s from "./AccessibilityPanel.module.css";
import preferencesStyle from "./SitePreferences.module.css";
export function AccessibilityPanel() {
 const a=useAccessibility(), dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),title=useRef<HTMLHeadingElement>(null);
 const [voiceState,setVoiceState]=useState<SpeechVoiceState>("loading");
 const [retryText,setRetryText]=useState("");
 useEffect(()=>{if(a.panelOpen)return prepareSpeechVoices(setVoiceState);},[a.panelOpen]);
 const [message,setMessage]=useState(""),[speaking,setSpeaking]=useState(false),[selectionMode,setSelectionMode]=useState(false);
 useEffect(()=>{
  const el=dialog.current;if(!el)return;
  if(a.panelOpen&&!el.open){el.showModal();el.scrollTop=0;title.current?.focus();}
  if(!a.panelOpen&&el.open)el.close();
 },[a.panelOpen]);
 useEffect(()=>{
  const stopped=()=>{setSpeaking(false);setSelectionMode(false);setMessage("");setRetryText("");};
  const hidden=()=>{if(document.hidden)stopSpeech();};
  window.addEventListener("infimatch:speech-stop",stopped);
  window.addEventListener("infimatch:session-expired",stopSpeech);
  window.addEventListener("pagehide",stopSpeech);document.addEventListener("visibilitychange",hidden);
  return ()=>{window.removeEventListener("infimatch:speech-stop",stopped);window.removeEventListener("infimatch:session-expired",stopSpeech);window.removeEventListener("pagehide",stopSpeech);document.removeEventListener("visibilitychange",hidden);stopSpeech();};
 },[]);
 const read=(text:string)=>{
  let reported=false;
  const result=speakText(text,()=>{reported=true;setSpeaking(false);setMessage("Lecture terminée.");},reason=>{reported=true;setSpeaking(false);setRetryText(text);setMessage(reason);},()=>{reported=true;setSpeaking(true);setRetryText("");setMessage("Lecture en cours. Si vous n’entendez rien, vérifiez le volume multimédia et la sortie audio du téléphone.");});
  if(!result.ok){setSpeaking(false);setRetryText(text);setMessage(result.reason);}
  else if(!reported){setSpeaking(true);setRetryText("");setMessage("Démarrage de la lecture…");}
 };
 const readPage=()=>{
  // Close the native modal synchronously: its background is inert on mobile browsers.
  dialog.current?.close();a.closePanel();
  read(pageTextForSpeech());
 };
 return <>
  <button ref={trigger} type="button" className={preferencesStyle.trigger} aria-haspopup="dialog" aria-expanded={a.panelOpen} aria-controls="a11y-preferences" onClick={a.openPanel}>Accessibilité</button>
  {(speaking||selectionMode||message) && !a.panelOpen && <div className={s.speechBar} role="region" aria-label="Lecture vocale">
   <p role="status" className={s.speechBarText}>{message || "Sélectionnez du texte puis choisissez Lire la sélection."}</p>
   <div className={s.speechBarActions}>
    {retryText && <button type="button" onClick={()=>read(retryText)}>Réessayer la lecture</button>}
    {selectionMode && <button type="button" onClick={()=>read(selectionTextForSpeech())}>Lire la sélection</button>}
    <button type="button" onClick={stopSpeech}>Arrêter et fermer</button>
   </div>
  </div>}
  <dialog ref={dialog} id="a11y-preferences" className={s.dialog} aria-labelledby="a11y-title" aria-describedby="a11y-summary"
   onCancel={e=>{e.preventDefault();a.closePanel();}}
   onClose={()=>{a.closePanel();trigger.current?.focus();}}>
   <div className={s.heading}><h2 id="a11y-title" ref={title} tabIndex={-1}>Options d’accessibilité</h2><button type="button" className={s.close} aria-label="Fermer les options d’accessibilité" onClick={a.closePanel}>×</button></div>
   <p id="a11y-summary">Adaptez l’affichage sur cet appareil. Ces aides complètent votre navigateur et votre lecteur d’écran.</p>
   <fieldset className={s.group}><legend>Agrandissement des textes et commandes</legend><div className={s.radios}>
    {([["normal","Normal"],["large","Grand (115 %)"],["xlarge","Très grand (130 %)"]] as const).map(([v,label])=><label key={v}><input type="radio" name="a11y-text-size" checked={a.preferences.textSize===v} onChange={()=>a.setTextSize(v)} /> {label}</label>)}
   </div><p className={s.help}>Vous pouvez aussi utiliser le zoom de votre navigateur.</p></fieldset>
   <fieldset className={s.group}><legend>Affichage</legend><div className={s.checks}>
    <label><input type="checkbox" checked={a.preferences.highContrast} onChange={e=>a.setHighContrast(e.target.checked)} /> Contraste renforcé</label>
    <label><input type="checkbox" checked={a.preferences.readableFont} onChange={e=>a.setReadableFont(e.target.checked)} /> Police de lecture Lexend</label>
    <label><input type="checkbox" checked={a.preferences.wideSpacing} onChange={e=>a.setWideSpacing(e.target.checked)} /> Espacement du texte augmenté</label>
    <label><input type="checkbox" checked={a.preferences.underlineLinks} onChange={e=>a.setUnderlineLinks(e.target.checked)} /> Souligner les liens</label>
    <label><input type="checkbox" checked={a.preferences.reduceMotion} onChange={e=>a.setReduceMotion(e.target.checked)} /> Réduire les animations</label>
   </div></fieldset>
   <fieldset className={s.group}><legend>Lecture vocale facultative</legend><p className={s.help}>La lecture démarre uniquement à votre demande, avec une voix déclarée locale par votre navigateur. Les champs de formulaire ne sont pas lus. La lecture s’arrête lorsque vous changez de page ou masquez cet onglet.</p>
    {isSpeechSynthesisAvailable() && <p role="status" className={s.help}>{voiceState==="loading" ? "Préparation de la voix française…" : voiceState==="ready" ? "Voix française locale disponible. Appuyez sur Lire la page pour démarrer." : LOCAL_VOICE_HELP}</p>}
    {isSpeechSynthesisAvailable()?<div className={s.speechActions}>
     <button type="button" onClick={readPage} disabled={voiceState==="loading"}>Lire la page</button>
     <button type="button" onClick={()=>{stopSpeech();setSelectionMode(true);a.closePanel();}}>Choisir une sélection à lire</button>
     <button type="button" onClick={stopSpeech} disabled={!speaking}>Arrêter la lecture</button>
    </div>:<p role="status">Lecture vocale indisponible dans ce navigateur. Utilisez votre lecteur d’écran.</p>}
   </fieldset>
   {message&&<p role="status" className={s.notice}>{message}</p>}
   {!a.persisted&&<p role="status" className={s.notice}>La mémorisation est indisponible. Les choix restent actifs pour cette visite.</p>}
   <div className={s.actions}><button type="button" onClick={a.resetPreferences}>Réinitialiser</button><button type="button" onClick={a.closePanel}>Fermer</button></div>
   <p className={s.footnote}><a href="/accessibilite">État des travaux d’accessibilité</a>. Ces options ne constituent pas une certification RGAA.</p>
  </dialog>
 </>;
}
