<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Confirmar acción'
  },
  message: {
    type: String,
    default: ''
  },
  confirmLabel: {
    type: String,
    default: 'Confirmar'
  },
  loading: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'danger'
  }
});

defineEmits(['confirm', 'cancel']);
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6">
      <h3 class="text-lg font-bold text-slate-900">{{ title }}</h3>
      <p class="text-sm text-slate-600 mt-2 leading-relaxed">{{ message }}</p>

      <div class="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          :disabled="loading"
          class="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
          @click="$emit('cancel')"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="loading"
          class="px-4 py-2 text-sm font-semibold text-white rounded-xl transition disabled:opacity-50 cursor-pointer"
          :class="variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'"
          @click="$emit('confirm')"
        >
          {{ loading ? 'Procesando...' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
