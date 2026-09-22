import { PageScroll } from './PageScroll';
import {DRAFT_EXPIRED_EVENT, verifierExpiration} from '@/pages/inscription/state';
import {SITE_ORIGIN, PUBLIC_PATHS, setPageMetadata} from '@/lib/pageMetadata';
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Button } from '@/ui/Button';
import { applyUpdate, updateAvailable } from '@/lib/pwa';
const origin = SITE_ORIGIN;
const publicPages = PUBLIC_PATHS;
export function QualityRoot() {
  const location = useLocation();
  const navigate = useNavigate();
  const [draftVersion,setDraftVersion]=useState(0),[draftExpired,setDraftExpired]=useState(false);
  useEffect(()=>{
    const expired=()=>{if(window.location.pathname.startsWith('/inscription')){setDraftExpired(true);setDraftVersion(v=>v+1);navigate('/inscription',{replace:true});}};
    const check=()=>{verifierExpiration();};
    window.addEventListener(DRAFT_EXPIRED_EVENT,expired);window.addEventListener('pageshow',check);document.addEventListener('visibilitychange',check);check();
    return ()=>{window.removeEventListener(DRAFT_EXPIRED_EVENT,expired);window.removeEventListener('pageshow',check);document.removeEventListener('visibilitychange',check);};
  },[navigate]);
  const [online, setOnline] = useState(navigator.onLine);
  const [, render] = useState(0);
  useEffect(() => {
    const network = () => setOnline(navigator.onLine), update = () => render(v => v + 1);
    window.addEventListener('online', network); window.addEventListener('offline', network); window.addEventListener('infimatch:pwa', update);
    return () => { window.removeEventListener('online', network); window.removeEventListener('offline', network); window.removeEventListener('infimatch:pwa', update); };
  }, []);
  useEffect(() => {
    setPageMetadata(location.pathname);
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots); }
    const indexable = publicPages.has(location.pathname) && !location.search && window.location.origin === origin;
    robots.content = indexable ? 'index,follow' : 'noindex,follow';
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (publicPages.has(location.pathname)) {
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
      canonical.href = origin + location.pathname;
      if (!ogUrl) { ogUrl = document.createElement('meta'); ogUrl.setAttribute('property', 'og:url'); document.head.append(ogUrl); }
      ogUrl.content = origin + location.pathname;
    } else { canonical?.remove(); ogUrl?.remove(); }
  }, [location.pathname, location.search]);
  return <>
    {draftExpired && location.pathname.startsWith('/inscription') && <p role="status" className="qualityNotice">Votre brouillon d’inscription a expiré et a été effacé de cet appareil. Vous pouvez recommencer.</p>}
    {!online && <p role="status" className="qualityNotice">Hors connexion. Les données affichées peuvent être anciennes. Les modifications et candidatures nécessitent le réseau.</p>}
    {updateAvailable() && <div className="qualityNotice" role="status"><p>Une mise à jour est disponible. Terminez et enregistrez vos formulaires avant de recharger.</p><Button variant="outline" onClick={applyUpdate}>Mettre à jour et recharger</Button></div>}
    <Suspense fallback={<main id="contenu" tabIndex={-1} className="qualityNotice" style={{ minHeight: "100dvh" }} aria-busy="true"><p role="status">Chargement de la page…</p></main>}><Outlet key={draftVersion} /><PageScroll /></Suspense>
  </>;
}
