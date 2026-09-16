import {useEffect,useRef,useState} from "react";
import {api} from "@/services/api";
import {Button} from "@/ui/Button";
import {idlePhase,IDLE_TIMEOUT_MS} from "@/lib/idleSession";
export function SessionInactivity({userId,expiresAt,onExpire}:{userId:string;expiresAt?:number;onExpire:()=>void}) {
 const [warning,setWarning]=useState(false),[error,setError]=useState("");
 const renewRef=useRef<()=>void>(()=>{});
 useEffect(()=>{
  let deadline=expiresAt || Date.now()+IDLE_TIMEOUT_MS,lastSent=0,pending=false,ended=false;
  const controller=new AbortController();
  const channel=typeof BroadcastChannel!=="undefined"?new BroadcastChannel("infimatch-activity-"+userId):null;
  const expire=()=>{if(ended)return;ended=true;channel?.postMessage({expired:true});try{sessionStorage.setItem("infimatch:expired","1");}catch{}onExpire();void api("/auth/logout",{method:"POST"}).catch(()=>{});};
  const tick=()=>{const phase=idlePhase(deadline,Date.now());if(phase==="expired")expire();else setWarning(phase==="warning");};
  const renew=async(force=false)=>{
   if(ended||pending)return;
   if(Date.now()>=deadline){expire();return;}
   if(!force && Date.now()-lastSent<30_000)return;
   pending=true;lastSent=Date.now();
   try{const r=await api<{idleExpiresAt:number}>("/auth/activity",{method:"POST",signal:controller.signal});if(!controller.signal.aborted && Number.isFinite(r.idleExpiresAt)){deadline=r.idleExpiresAt;channel?.postMessage({expiresAt:deadline});setError("");tick();}}
   catch{if(!controller.signal.aborted)setError("Impossible de prolonger la session. Vérifiez votre connexion avant son expiration.");}
   finally{pending=false;}
  };
  renewRef.current=()=>void renew(true);
  const activity=(event:Event)=>{if(event.isTrusted)void renew();};
  const visible=()=>{tick();};
  for(const event of ["pointerdown","keydown","wheel","touchstart"])window.addEventListener(event,activity,{passive:true});
  document.addEventListener("visibilitychange",visible);window.addEventListener("focus",visible);
  if(channel)channel.onmessage=event=>{if(event.data?.expired){ended=true;onExpire();}else if(Number.isFinite(event.data?.expiresAt)){deadline=event.data.expiresAt;tick();}};
  tick();const timer=window.setInterval(tick,1000);
  return()=>{ended=true;controller.abort();clearInterval(timer);channel?.close();for(const event of ["pointerdown","keydown","wheel","touchstart"])window.removeEventListener(event,activity);document.removeEventListener("visibilitychange",visible);window.removeEventListener("focus",visible);};
 },[userId,expiresAt,onExpire]);
 if(!warning && !error)return null;
 return <aside role="alert" style={{position:"fixed",zIndex:2000,bottom:20,left:"50%",transform:"translateX(-50%)",width:"min(600px,calc(100% - 32px))",padding:20,border:"2px solid var(--brand-600)",borderRadius:12,background:"white",color:"var(--ink-900)",boxShadow:"0 6px 24px #0003"}}>
  {warning&&<p>Votre session va expirer dans moins d’une minute après 15 minutes sans activité.</p>}{error&&<p>{error}</p>}
  <Button onClick={()=>renewRef.current()}>Rester connecté</Button>
 </aside>;
}
