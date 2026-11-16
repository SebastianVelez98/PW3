<script setup>
defineProps({
  state: {
    type: String,
    required: true,
    validator: (v) => ['loading', 'empty', 'error'].includes(v)
  },
  error: {
    type: Object,
    default: null
  },
  loadingText: {
    type: String,
    default: 'Cargando carta de cafetería...'
  },
  emptyTitle: {
    type: String,
    default: 'Sin resultados'
  },
  emptyMessage: {
    type: String,
    default: 'No se encontraron ítems con los criterios actuales.'
  },
  actionLabel: {
    type: String,
    default: ''
  }
});

defineEmits(['retry', 'action']);
</script>

<template>
  <!-- Estado: Carga -->
  <div
    v-if="state === 'loading'"
    role="status"
    aria-live="polite"
    class="bg-white border border-stone-200 rounded-2xl p-8 shadow-xs"
  >
    <div class="flex flex-col items-center justify-center text-center gap-3 mb-6">
      <div class="w-10 h-10 rounded-full border-3 border-amber-200 border-t-amber-700 animate-spin"></div>
      <p class="text-sm font-medium text-stone-600">{{ loadingText }}</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      <div v-for="n in 3" :key="n" class="h-32 rounded-xl bg-stone-100 border border-stone-200/70"></div>
    </div>
  </div>

  <!-- Estado: Error -->
  <div
    v-else-if="state === 'error'"
    role="alert"
    class="bg-rose-50/70 border border-rose-200 rounded-2xl p-6 sm:p-8 text-center"
  >
    <div class="mx-auto w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
    <div class="flex items-center justify-center gap-2 mb-1">
      <span
        v-if="error?.status"
        class="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700"
      >
        HTTP {{ error.status }}
      </span>
      <span
        v-if="error?.codigo"
        class="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-white text-rose-700 border border-rose-200"
      >
        {{ error.codigo }}
      </span>
    </div>
    <h3 class="text-base font-bold text-stone-900 mt-2">No se pudo completar la operación</h3>
    <p class="text-sm text-stone-600 mt-1 max-w-lg mx-auto">
      {{ error?.mensaje || error?.message || 'Error de comunicación con la API.' }}
    </p>
    <div class="mt-5 flex items-center justify-center gap-3">
      <button
        type="button"
        class="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition cursor-pointer"
        @click="$emit('retry')"
      >
        Reintentar petición
      </button>
    </div>
  </div>

  <!-- Estado: Vacío -->
  <div
    v-else
    class="bg-white border border-dashed border-stone-300 rounded-2xl p-8 sm:p-10 text-center"
  >
    <div class="mx-auto w-12 h-12 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mb-3">
      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      </svg>
    </div>
    <h3 class="text-base font-bold text-stone-900">{{ emptyTitle }}</h3>
    <p class="text-sm text-stone-500 mt-1 max-w-md mx-auto">{{ emptyMessage }}</p>
    <div v-if="actionLabel" class="mt-5">
      <button
        type="button"
        class="px-4 py-2 text-sm font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition cursor-pointer"
        @click="$emit('action')"
      >
        {{ actionLabel }}
      </button>
    </div>
  </div>
</template>
