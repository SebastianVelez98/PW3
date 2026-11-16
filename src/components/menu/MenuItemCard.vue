<script setup>
import { computed } from 'vue';
import StockBadge from '../common/StockBadge.vue';
import { formatCurrency } from '../../utils/formatters.js';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  inOrderQuantity: {
    type: Number,
    default: 0
  },
  isOffline: {
    type: Boolean,
    default: false
  }
});

defineEmits(['add-to-order', 'view-detail']);

const canAdd = computed(
  () => !props.isOffline && props.item.porciones > 0 && props.inOrderQuantity < props.item.porciones
);
</script>

<template>
  <article
    class="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-amber-300 transition flex flex-col justify-between gap-4"
  >
    <div>
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
            {{ item.codigo }}
          </span>
          <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800">
            ~{{ item.tiempoPreparacion }} min
          </span>
        </div>
        <StockBadge
          :estado="item.calculos?.estadoStock || 'OPTIMO'"
          :stock="item.porciones"
        />
      </div>

      <button
        type="button"
        class="mt-3 text-left group cursor-pointer block w-full"
        @click="$emit('view-detail', item.id)"
      >
        <h3 class="text-base font-bold text-stone-900 group-hover:text-amber-800 transition line-clamp-1">
          {{ item.nombre }}
        </h3>
        <p class="text-xs font-medium text-amber-700 mt-0.5">{{ item.categoria }}</p>
      </button>

      <p class="text-sm text-stone-600 mt-2 line-clamp-2 min-h-[2.5rem]">
        {{ item.descripcion || 'Preparación artesanal de la casa.' }}
      </p>
    </div>

    <div class="pt-3 border-t border-stone-100 space-y-3">
      <div class="flex items-end justify-between">
        <div>
          <p class="text-[11px] text-stone-500">
            Base: {{ formatCurrency(item.precio) }} + IVA {{ formatCurrency(item.calculos?.impuesto) }}
          </p>
          <p class="text-xl font-extrabold text-stone-900 tabular-nums">
            {{ formatCurrency(item.calculos?.precioTotal ?? item.precio) }}
          </p>
        </div>

        <span
          v-if="inOrderQuantity > 0"
          class="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
        >
          {{ inOrderQuantity }} en pedido
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="!canAdd"
          class="flex-1 px-3.5 py-2 text-xs font-semibold rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
          :class="
            canAdd
              ? 'bg-amber-800 hover:bg-amber-900 text-white shadow-xs'
              : 'bg-stone-100 text-stone-400'
          "
          @click="$emit('add-to-order', item)"
        >
          <span v-if="isOffline">Solo lectura offline</span>
          <span v-else-if="item.porciones <= 0">Agotado hoy</span>
          <span v-else-if="inOrderQuantity >= item.porciones">Máximo disponible</span>
          <span v-else>+ Agregar al pedido</span>
        </button>

        <button
          type="button"
          class="px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer"
          @click="$emit('view-detail', item.id)"
        >
          Detalle
        </button>
      </div>
    </div>
  </article>
</template>
