import { markSwUpdateAvailable, setSwRegistration } from '../composables/useNetworkStatus.js';

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    setSwRegistration(registration);

    if (registration.waiting) {
      markSwUpdateAvailable();
    }

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;

      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          markSwUpdateAvailable();
        }
      });
    });

    return registration;
  } catch (err) {
    console.warn('[PWA] No se pudo registrar el Service Worker:', err);
    return null;
  }
}
