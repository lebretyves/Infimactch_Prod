import { useEffect } from 'react';

const SUFFIXE = 'InfiMatch';

export function usePageTitle(titre: string, description?: string) {
  useEffect(() => {
    document.title = `${titre} — ${SUFFIXE}`;

    if (!description) return;

    const meta = document.querySelector('meta[name="description"]');
    const precedente = meta?.getAttribute('content');
    meta?.setAttribute('content', description);

    return () => {
      if (precedente) meta?.setAttribute('content', precedente);
    };
  }, [titre, description]);
}
