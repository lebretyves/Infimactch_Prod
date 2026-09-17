export function notificationHref(href:string,id:string){
 const url=new URL(href||'/accueil',window.location.origin);
 if(url.origin!==window.location.origin)return '/notifications';
 url.searchParams.set('notification',id);
 return url.pathname+url.search+url.hash;
}
