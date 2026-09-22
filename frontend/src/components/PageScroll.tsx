import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router';

/** Run inside Suspense, once the destination page has mounted. */
export function PageScroll() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    if (hash) {
      let id = hash.slice(1);
      try { id = decodeURIComponent(id); } catch { /* Keep malformed anchors literal. */ }
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ block: 'start', behavior: 'instant' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}
