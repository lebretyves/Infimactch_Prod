import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router';
import {useAuth} from '@/context/AuthContext';
import {api,ApiError} from '@/services/api';

/** Only authenticated consultation in the app is observable; Discord delivery is not reading. */
export function NotificationRead(){
 const {user}=useAuth(),location=useLocation(),navigate=useNavigate();
 const [warning,setWarning]=useState('');
 useEffect(()=>{
  const params=new URLSearchParams(location.search),id=params.get('notification');
  setWarning('');
  if(!user?.id||!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return;
  let disposed=false,pending=false,attempts=0,timer:ReturnType<typeof setTimeout>|undefined;
  const read=async()=>{
   if(disposed||pending||document.visibilityState!=='visible'||!navigator.onLine)return;
   pending=true;attempts++;
   try{
    await api('/me/notifications/'+id+'/read',{method:'POST'});
    if(disposed)return;
    params.delete('notification');const search=params.toString();
    navigate({pathname:location.pathname,search:search?'?'+search:'',hash:location.hash},{replace:true});
   }catch(error){
    if(disposed)return;
    if(error instanceof ApiError&&[403,404].includes(error.status))return;
    setWarning('Le statut de lecture n’a pas pu être synchronisé. Vous pouvez continuer à consulter cette page.');
    if(attempts<3)timer=setTimeout(()=>void read(),3000);
   }finally{pending=false;}
  };
  const resume=()=>{if(attempts<3)void read();};
  void read();document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);
  return()=>{disposed=true;clearTimeout(timer);document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',resume);};
 },[user?.id,location.pathname,location.search,location.hash,navigate]);
 return warning?<p role="status">{warning}</p>:null;
}
