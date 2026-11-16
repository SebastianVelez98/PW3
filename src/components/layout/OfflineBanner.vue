<script setup>
import { formatDateTime } from '../../utils/formatters.js';

defineProps({
  isOffline: {
    type: Boolean,
    default: false
  },
  servingOfflineCache: {
    type: Boolean,
    default: false
  },
  lastCachedAt: {
    type: String,
    default: null
  }
});
</script>

<template>
  <div
    v-if="isOffline || servingOfflineCache"
    role="status"
    class="bg-amber-50 border-b border-amber-200 text-amber-950"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-amber-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p>
          <strong>Modo offline limitado y seguro:</strong>
          <span v-if="isOffline">
            Sin conexión. La carta cacheada sigue visible para consulta, pero el envío de pedidos y la edición del menú están deshabilitados.
          </span>
          <span v-else>
            Mostrando copia de la carta desde caché local mientras el servidor de cafetería no responde.
          </span>
        </p>
      </div>
      <span v-if="lastCachedAt" class="text-xs font-medium text-amber-800">
        Última sincronización: {{ formatDateTime(lastCachedAt) }}
      </span>
    </div>
  </div>
</template>
