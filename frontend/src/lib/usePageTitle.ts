import { useEffect } from 'react';

const SUFFIXE = 'InfiMatch';

export function usePageTitle(titre: string, description?: string) {
  useEffect(() => {
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
  }, [titre, description]);
}
