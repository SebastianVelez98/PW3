<script setup>
import { onMounted } from 'vue';
import AppHeader from './components/layout/AppHeader.vue';
import OfflineBanner from './components/layout/OfflineBanner.vue';
import ToastContainer from './components/layout/ToastContainer.vue';
import { useAuth } from './composables/useAuth.js';
import { useOrderCart } from './composables/useOrderCart.js';
import { useNetworkStatus } from './composables/useNetworkStatus.js';
import { useToast } from './composables/useToast.js';

const { usuario, checkSession, logout } = useAuth();
const { totales } = useOrderCart();
const {
  isOffline,
  servingOfflineCache,
  lastCachedAt,
  canInstall,
  swUpdateAvailable,
  promptInstall,
  applySwUpdate
} = useNetworkStatus();
const { toasts, dismiss, info, success } = useToast();

onMounted(() => {
  checkSession();
});

async function handleInstall() {
  const accepted = await promptInstall();
  if (accepted) {
    success('AromaPOS instalada en tu dispositivo.');
  }
}

async function handleLogout() {
  await logout();
  info('Turno cerrado.');
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-stone-50 text-stone-900">
    <AppHeader
      :is-offline="isOffline"
      :can-install="canInstall"
      :sw-update-available="swUpdateAvailable"
      :order-count="totales.totalUnidades"
      :usuario="usuario"
      @install-pwa="handleInstall"
      @apply-update="applySwUpdate"
      @logout="handleLogout"
    />

    <OfflineBanner
      :is-offline="isOffline"
      :serving-offline-cache="servingOfflineCache"
      :last-cached-at="lastCachedAt"
    />

    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <RouterView />
    </main>

    <footer class="border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-500">
      AromaPOS SPA/PWA &middot; Vue 3 + Vite + Fetch Centralizado + Service Worker &middot; Cafetería &amp; Pedidos
    </footer>

    <ToastContainer :toasts="toasts" @dismiss="dismiss" />
  </div>
</template>
