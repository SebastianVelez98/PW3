import { readonly, ref } from 'vue';

const toasts = ref([]);
let nextToastId = 1;

export function useToast() {
  function dismiss(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function show(message, type = 'info', durationMs = 4000) {
    const id = nextToastId++;
    toasts.value = [...toasts.value, { id, message, type }];
    if (durationMs > 0) {
      setTimeout(() => dismiss(id), durationMs);
    }
    return id;
  }

  return {
    toasts: readonly(toasts),
    show,
    success: (msg, ms) => show(msg, 'success', ms),
    error: (msg, ms) => show(msg, 'error', ms ?? 5500),
    warning: (msg, ms) => show(msg, 'warning', ms ?? 4500),
    info: (msg, ms) => show(msg, 'info', ms),
    dismiss
  };
}
