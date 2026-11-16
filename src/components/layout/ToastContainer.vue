<script setup>
defineProps({
  toasts: {
    type: Array,
    default: () => []
  }
});

defineEmits(['dismiss']);

function styleForType(type) {
  switch (type) {
    case 'success':
      return 'bg-emerald-900 text-emerald-50 border-emerald-700';
    case 'error':
      return 'bg-rose-900 text-rose-50 border-rose-700';
    case 'warning':
      return 'bg-amber-900 text-amber-50 border-amber-700';
    default:
      return 'bg-slate-900 text-slate-50 border-slate-700';
  }
}
</script>

<template>
  <div
    class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    aria-live="polite"
  >
    <TransitionGroup name="fade">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto border rounded-xl px-4 py-3 shadow-lg flex items-start justify-between gap-3 text-sm"
        :class="styleForType(toast.type)"
      >
        <p class="leading-snug font-medium">{{ toast.message }}</p>
        <button
          type="button"
          class="opacity-70 hover:opacity-100 text-xs font-bold shrink-0 cursor-pointer"
          aria-label="Cerrar notificación"
          @click="$emit('dismiss', toast.id)"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
