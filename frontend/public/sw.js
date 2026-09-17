/* Static-only PWA cache. No page shell, API, account, document or admin data. */
const CACHE = 'infimatch-static-v1';
const STATIC = new Set(['/offline.html', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png']);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...STATIC])));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('infimatch-') && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Never intercept sensitive routes, including navigation to a download endpoint.
  if (/^\/(api|auth|admin|documents)(\/|$)/.test(url.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline.html')) || new Response('Hors connexion. Reconnectez-vous pour utiliser InfiMatch.', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } })));
  } else if (!url.search && STATIC.has(url.pathname)) {
    event.respondWith(caches.match(request).then(hit => hit || fetch(request)));
  }
});
