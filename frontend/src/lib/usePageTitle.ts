import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { PUBLIC_PATHS, setPageMetadata } from './pageMetadata';

const SUFFIXE = 'InfiMatch';

export function usePageTitle(titre: string, description?: string) {
  const { pathname } = useLocation();
  useEffect(() => {
    // Public metadata has a single source, also consumed by the static build.
    if (PUBLIC_PATHS.has(pathname) || pathname === "/aide") { setPageMetadata(pathname); return; }
    document.title = `${titre} — ${SUFFIXE}`;
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", document.title);

    if (!description) return;

    const meta = document.querySelector('meta[name="description"]');
    const precedente = meta?.getAttribute('content');
    meta?.setAttribute('content', description);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);

    return () => {
      if (precedente) meta?.setAttribute('content', precedente);
    };
  }, [titre, description, pathname]);
}
