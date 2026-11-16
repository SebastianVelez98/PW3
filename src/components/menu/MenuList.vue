<script setup>
import MenuItemCard from './MenuItemCard.vue';
import StockBadge from '../common/StockBadge.vue';
import { formatCurrency } from '../../utils/formatters.js';

defineProps({
  items: {
    type: Array,
    required: true
  },
  orderQuantities: {
    type: Object,
    default: () => ({})
  },
  viewMode: {
    type: String,
    default: 'grid'
  },
  isOffline: {
    type: Boolean,
    default: false
  },
  showAdminActions: {
    type: Boolean,
    default: false
  },
  canMutate: {
    type: Boolean,
    default: true
  }
});

defineEmits(['add-to-order', 'view-detail', 'edit', 'delete']);
</script>

<template>
  <!-- Vista en Tarjetas -->
  <div v-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    <MenuItemCard
      v-for="item in items"
      :key="item.id"
      :item="item"
      :in-order-quantity="orderQuantities[item.id] || 0"
      :is-offline="isOffline"
      @add-to-order="$emit('add-to-order', $event)"
      @view-detail="$emit('view-detail', $event)"
    />
  </div>

  <!-- Vista en Lista / Tabla -->
  <div v-else class="bg-white border border-stone-200 rounded-2xl shadow-2xs overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="bg-stone-50 border-b border-stone-200 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <th class="py-3.5 px-4">Código</th>
            <th class="py-3.5 px-4">Plato / Bebida</th>
            <th class="py-3.5 px-4">Categoría</th>
            <th class="py-3.5 px-4 text-center">Prep.</th>
            <th class="py-3.5 px-4 text-right">Precio</th>
            <th class="py-3.5 px-4 text-right">Total c/IVA</th>
            <th class="py-3.5 px-4">Porciones</th>
            <th class="py-3.5 px-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
          <tr
            v-for="item in items"
            :key="item.id"
            class="hover:bg-stone-50/80 transition"
          >
            <td class="py-3.5 px-4 font-mono text-xs font-semibold text-stone-700 whitespace-nowrap">
              {{ item.codigo }}
            </td>
            <td class="py-3.5 px-4">
              <button
                type="button"
                class="font-semibold text-stone-900 hover:text-amber-800 text-left cursor-pointer"
                @click="$emit('view-detail', item.id)"
              >
                {{ item.nombre }}
              </button>
              <p v-if="item.descripcion" class="text-xs text-stone-500 line-clamp-1">
                {{ item.descripcion }}
              </p>
            </td>
            <td class="py-3.5 px-4 text-stone-600 whitespace-nowrap">{{ item.categoria }}</td>
            <td class="py-3.5 px-4 text-center text-xs font-medium text-stone-600 whitespace-nowrap">
              {{ item.tiempoPreparacion }} min
            </td>
            <td class="py-3.5 px-4 text-right tabular-nums text-stone-700 whitespace-nowrap">
              {{ formatCurrency(item.precio) }}
            </td>
            <td class="py-3.5 px-4 text-right tabular-nums font-bold text-stone-900 whitespace-nowrap">
              {{ formatCurrency(item.calculos?.precioTotal ?? item.precio) }}
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
              <StockBadge
                :estado="item.calculos?.estadoStock || 'OPTIMO'"
                :stock="item.porciones"
              />
            </td>
            <td class="py-3.5 px-4 text-right whitespace-nowrap">
              <div class="inline-flex items-center gap-1.5">
                <template v-if="showAdminActions">
                  <button
                    type="button"
                    :disabled="!canMutate || isOffline"
                    class="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    @click="$emit('edit', item)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    :disabled="!canMutate || isOffline"
                    class="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    @click="$emit('delete', item)"
                  >
                    Retirar
                  </button>
                </template>
                <template v-else>
                  <button
                    type="button"
                    :disabled="isOffline || item.porciones <= 0 || (orderQuantities[item.id] || 0) >= item.porciones"
                    class="px-2.5 py-1 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-lg transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    @click="$emit('add-to-order', item)"
                  >
                    + Pedir
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition cursor-pointer"
                    @click="$emit('view-detail', item.id)"
                  >
                    Ver
                  </button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
