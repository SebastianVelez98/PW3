<script setup>
import { formatCurrency } from '../../utils/formatters.js';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update-quantity', 'remove']);

function decrement() {
  emit('update-quantity', props.item.producto.id, props.item.cantidad - 1);
}

function increment() {
  emit('update-quantity', props.item.producto.id, props.item.cantidad + 1);
}
</script>

<template>
  <div class="flex items-center justify-between gap-3 py-3 border-b border-stone-100 last:border-none">
    <div class="min-w-0 flex-1">
      <p class="text-sm font-bold text-stone-900 truncate">{{ item.producto.nombre }}</p>
      <div class="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
        <span class="font-mono">{{ item.producto.codigo }}</span>
        <span>&middot;</span>
        <span>{{ formatCurrency(item.producto.precio) }} c/u</span>
        <span>&middot;</span>
        <span>Disp: {{ item.producto.porciones }}</span>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <div class="inline-flex items-center rounded-xl border border-stone-200 bg-stone-50">
        <button
          type="button"
          :disabled="disabled"
          aria-label="Disminuir cantidad"
          class="w-7 h-7 flex items-center justify-center text-sm font-bold text-stone-700 hover:bg-stone-200 rounded-l-xl disabled:opacity-40 cursor-pointer"
          @click="decrement"
        >
          -
        </button>
        <span class="w-8 text-center text-xs font-bold text-stone-900 tabular-nums">
          {{ item.cantidad }}
        </span>
        <button
          type="button"
          :disabled="disabled || item.cantidad >= item.producto.porciones"
          aria-label="Aumentar cantidad"
          class="w-7 h-7 flex items-center justify-center text-sm font-bold text-stone-700 hover:bg-stone-200 rounded-r-xl disabled:opacity-40 cursor-pointer"
          @click="increment"
        >
          +
        </button>
      </div>

      <span class="w-20 text-right text-sm font-bold text-stone-900 tabular-nums">
        {{ formatCurrency(item.producto.precio * item.cantidad) }}
      </span>

      <button
        type="button"
        :disabled="disabled"
        aria-label="Quitar ítem del pedido"
        class="p-1.5 text-stone-400 hover:text-rose-600 transition cursor-pointer disabled:opacity-40"
        @click="$emit('remove', item.producto.id)"
      >
        ✕
      </button>
    </div>
  </div>
</template>
