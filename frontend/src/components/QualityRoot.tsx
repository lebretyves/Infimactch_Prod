import {SITE_ORIGIN, PUBLIC_PATHS, setPageMetadata} from '@/lib/pageMetadata';
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Button } from '@/ui/Button';
import { applyUpdate, updateAvailable } from '@/lib/pwa';
const origin = SITE_ORIGIN;
const publicPages = PUBLIC_PATHS;
export function QualityRoot() {
  const location = useLocation();
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
    if (publicPages.has(location.pathname)) {
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
      canonical.href = origin + location.pathname;
    } else canonical?.remove();
  }, [location.pathname, location.search]);
  return <>
    {!online && <p role="status" className="qualityNotice">Hors connexion. Les données affichées peuvent être anciennes. Les modifications et candidatures nécessitent le réseau.</p>}
    {updateAvailable() && <div className="qualityNotice" role="status"><p>Une mise à jour est disponible. Terminez et enregistrez vos formulaires avant de recharger.</p><Button variant="outline" onClick={applyUpdate}>Mettre à jour et recharger</Button></div>}
    <Suspense fallback={<main id="contenu" tabIndex={-1} className="qualityNotice" aria-busy="true"><p role="status">Chargement de la page…</p></main>}><Outlet /></Suspense>
  </>;
}
