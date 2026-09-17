type InstallEvent = Event & { prompt(): Promise<{ outcome: string }>; userChoice: Promise<{ outcome: string }> };
let installEvent: InstallEvent | null = null;
let registration: ServiceWorkerRegistration | undefined;
const notify = () => window.dispatchEvent(new Event('infimatch:pwa'));
export const canInstall = () => !!installEvent;
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || !!(navigator as Navigator & { standalone?: boolean }).standalone;
export const updateAvailable = () => !!registration?.waiting;
export async function installApp() {
  const prompt = installEvent;
  if (!prompt) return 'unavailable';
  installEvent = null;
  notify();
  await prompt.prompt();
  return (await prompt.userChoice).outcome;
}
export async function clearAppCaches() {
  if ('caches' in window) for (const name of await caches.keys()) {
    if (name.startsWith('infimatch-')) await caches.delete(name);
  }
}
export function applyUpdate() {
  // No automatic reload: the user first finishes any form and explicitly agrees.
  if (!registration?.waiting) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
}
export function startPwa() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); installEvent = event as InstallEvent; notify();
  });
  window.addEventListener('appinstalled', () => { installEvent = null; notify(); });
  if (import.meta.env.PROD && import.meta.env.VITE_ROUTER !== 'hash' && 'serviceWorker' in navigator) {
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((value) => {
      registration = value; notify();
      value.addEventListener('updatefound', () => {
        value.installing?.addEventListener('statechange', notify);
      });
    }).catch(() => { /* Installation remains optional; the site works online. */ });
  }
}
