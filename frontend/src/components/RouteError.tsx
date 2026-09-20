import {useEffect,useRef} from 'react';
export function RouteError(){
 const title=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{document.title='Page indisponible — InfiMatch';title.current?.focus();},[]);
 return <main style={{maxWidth:640,margin:'3rem auto',padding:24,overflowWrap:'anywhere'}}>
  <h1 ref={title} tabIndex={-1}>Cette page n’a pas pu s’afficher</h1>
  <p>Un problème est survenu. Réessayez ou revenez à l’accueil.</p>
  <p>Un rechargement peut effacer les informations non enregistrées.</p>
  <button type="button" onClick={()=>window.location.reload()}>Réessayer</button>{' · '}
  <a href={import.meta.env.VITE_ROUTER==='hash'?'#/':'/'}>Revenir à l’accueil</a>
 </main>;
}
