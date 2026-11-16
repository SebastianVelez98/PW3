import { computed, readonly, ref } from 'vue';

const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
const servingOfflineCache = ref(false);
const lastCachedAt = ref(null);
const deferredInstallPrompt = ref(null);
const isInstalled = ref(false);
const swRegistration = ref(null);
const swUpdateAvailable = ref(false);

let listenersAttached = false;

export function attachNetworkAndPwaListeners() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  window.addEventListener('online', () => {
    isOnline.value = true;
    servingOfflineCache.value = false;
  });

  window.addEventListener('offline', () => {
    isOnline.value = false;
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt.value = event;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt.value = null;
    isInstalled.value = true;
  });

  if (window.matchMedia?.('(display-mode: standalone)').matches) {
    isInstalled.value = true;
  }
}

export function setCacheIndicator({ fromOfflineCache, cachedAt }) {
  servingOfflineCache.value = Boolean(fromOfflineCache);
  if (cachedAt) {
    lastCachedAt.value = cachedAt;
  }
}

export function setSwRegistration(reg) {
  swRegistration.value = reg;
}

export function markSwUpdateAvailable() {
  swUpdateAvailable.value = true;
}

export function useNetworkStatus() {
  const isOffline = computed(() => !isOnline.value);
  const canInstall = computed(() => Boolean(deferredInstallPrompt.value) && !isInstalled.value);

  async function promptInstall() {
    if (!deferredInstallPrompt.value) return false;
    deferredInstallPrompt.value.prompt();
    const choice = await deferredInstallPrompt.value.userChoice;
    deferredInstallPrompt.value = null;
    return choice?.outcome === 'accepted';
  }

  function applySwUpdate() {
    const waiting = swRegistration.value?.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    swUpdateAvailable.value = false;
    window.location.reload();
  }

  return {
    isOnline: readonly(isOnline),
    isOffline,
    servingOfflineCache: readonly(servingOfflineCache),
    lastCachedAt: readonly(lastCachedAt),
    canInstall,
    isInstalled: readonly(isInstalled),
    swUpdateAvailable: readonly(swUpdateAvailable),
    promptInstall,
    applySwUpdate
  };
}
