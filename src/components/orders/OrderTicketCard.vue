<script setup>
import { computed } from 'vue';
import { formatCurrency, formatDateTime, getEstadoPedidoMeta } from '../../utils/formatters.js';

const props = defineProps({
  pedido: {
    type: Object,
    required: true
  },
  updating: {
    type: Boolean,
    default: false
  },
  canAdvance: {
    type: Boolean,
    default: false
  },
  isOffline: {
    type: Boolean,
    default: false
  }
});

defineEmits(['advance-state']);

const estadoMeta = computed(() => getEstadoPedidoMeta(props.pedido.estado));
</script>

<template>
  <article class="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
            {{ pedido.ticket }}
          </span>
          <span
            class="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
            :class="estadoMeta.classes"
          >
            {{ estadoMeta.label }}
          </span>
        </div>
        <h3 class="text-sm font-bold text-stone-900 mt-1.5">
          {{ pedido.clienteNombre }}
          <span class="font-normal text-stone-500">
            &middot; {{ pedido.tipoServicio }}<template v-if="pedido.numeroMesa"> ({{ pedido.numeroMesa }})</template>
          </span>
        </h3>
      </div>

      <div class="text-right">
        <p class="text-base font-extrabold text-emerald-700 tabular-nums">{{ formatCurrency(pedido.total) }}</p>
        <p class="text-[11px] text-stone-500">{{ formatDateTime(pedido.fecha) }}</p>
      </div>
    </div>

    <ul class="space-y-1 text-xs text-stone-700">
      <li
        v-for="item in pedido.items"
        :key="`${pedido.id}-${item.menuId}`"
        class="flex items-center justify-between gap-2"
      >
        <span><strong>{{ item.cantidad }}x</strong> {{ item.nombre }}</span>
        <span class="font-semibold text-stone-900 tabular-nums">{{ formatCurrency(item.subtotalLinea) }}</span>
      </li>
    </ul>

    <p v-if="pedido.notas" class="text-xs text-amber-900 bg-amber-50/70 border border-amber-200/70 rounded-lg px-2.5 py-1.5">
      Nota cocina: {{ pedido.notas }}
    </p>

    <div class="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
      <span>{{ pedido.metodoPago }} &middot; Prep ~{{ pedido.tiempoEstimadoMin }} min &middot; {{ pedido.atendidoPor }}</span>

      <button
        v-if="estadoMeta.nextEstado && canAdvance"
        type="button"
        :disabled="updating || isOffline"
        class="px-3 py-1 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-lg transition disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
        @click="$emit('advance-state', { id: pedido.id, estado: estadoMeta.nextEstado })"
      >
        {{ updating ? 'Actualizando...' : estadoMeta.nextLabel }}
      </button>
    </div>
  </article>
</template>
