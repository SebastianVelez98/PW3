<script setup>
import { onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StateFeedback from '../components/common/StateFeedback.vue';
import StockBadge from '../components/common/StockBadge.vue';
import { menuService } from '../services/menuService.js';
import { createLatestRequestGuard } from '../services/httpClient.js';
import { useOrderCart } from '../composables/useOrderCart.js';
import { setCacheIndicator, useNetworkStatus } from '../composables/useNetworkStatus.js';
import { useToast } from '../composables/useToast.js';
import { formatCurrency, formatDateTime } from '../utils/formatters.js';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { isOffline } = useNetworkStatus();
const { quantitiesMap, addItem } = useOrderCart();

const menuItem = ref(null);
const status = ref('loading');
const error = ref(null);
const cantidad = ref(1);

const guard = createLatestRequestGuard();

async function loadMenuItem(id) {
  status.value = 'loading';
  error.value = null;

  try {
    const res = await guard.run((signal) => menuService.obtenerPorId(id, { signal }));
    if (res.stale) return;

    if (!res.value.item) {
      menuItem.value = null;
      status.value = 'empty';
      return;
    }

    menuItem.value = res.value.item;
    cantidad.value = 1;
    setCacheIndicator({
      fromOfflineCache: res.value.fromOfflineCache,
      cachedAt: res.value.cachedAt
    });
    status.value = 'success';
  } catch (err) {
    error.value = err;
    status.value = 'error';
  }
}

watch(
  () => route.params.id,
  (newId) => {
    if (newId) loadMenuItem(newId);
  },
  { immediate: true }
);

onUnmounted(() => {
  guard.abort();
});

function handleAddToOrder() {
  if (!menuItem.value) return;
  const res = addItem(menuItem.value, cantidad.value);
  if (!res.ok) {
    toast.warning(res.reason);
    return;
  }
  toast.success(`Agregado(s) ${cantidad.value} unidad(es) a la comanda.`);
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between gap-3">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
        @click="router.push('/')"
      >
        &larr; Volver al menú
      </button>
      <RouterLink
        to="/carta"
        class="text-xs font-semibold text-amber-800 hover:text-amber-900"
      >
        Editar en Gestión Carta &rarr;
      </RouterLink>
    </div>

    <StateFeedback
      v-if="status !== 'success'"
      :state="status"
      :error="error"
      loading-text="Cargando detalle del menú..."
      empty-title="Ítem no disponible"
      empty-message="No se encontraron datos para este ítem de carta."
      @retry="loadMenuItem(route.params.id)"
    />

    <article
      v-else-if="menuItem"
      class="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6"
    >
      <div class="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-stone-100 text-stone-700">
              {{ menuItem.codigo }}
            </span>
            <span class="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md">
              {{ menuItem.categoria }}
            </span>
            <span class="text-xs font-semibold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-md">
              Prep: ~{{ menuItem.tiempoPreparacion }} min
            </span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-3">
            {{ menuItem.nombre }}
          </h1>
        </div>
        <StockBadge
          :estado="menuItem.calculos?.estadoStock || 'OPTIMO'"
          :stock="menuItem.porciones"
        />
      </div>

      <p class="text-stone-600 leading-relaxed">
        {{ menuItem.descripcion || 'Preparación artesanal elaborada al momento en barra.' }}
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <p class="text-xs font-semibold text-stone-500 uppercase">Precio Base</p>
          <p class="text-xl font-bold text-stone-900 mt-1 tabular-nums">
            {{ formatCurrency(menuItem.precio) }}
          </p>
        </div>
        <div class="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <p class="text-xs font-semibold text-stone-500 uppercase">IVA (15%)</p>
          <p class="text-xl font-bold text-stone-900 mt-1 tabular-nums">
            {{ formatCurrency(menuItem.calculos?.impuesto) }}
          </p>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p class="text-xs font-semibold text-amber-800 uppercase">PVP Final</p>
          <p class="text-xl font-extrabold text-amber-950 mt-1 tabular-nums">
            {{ formatCurrency(menuItem.calculos?.precioTotal ?? menuItem.precio) }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-100">
        <div class="flex items-center gap-3">
          <label for="detail-qty" class="text-xs font-semibold text-stone-700">Cantidad:</label>
          <input
            id="detail-qty"
            v-model.number="cantidad"
            type="number"
            min="1"
            :max="Math.max(1, menuItem.porciones)"
            class="w-20 px-3 py-2 text-sm font-bold bg-stone-50 border border-stone-200 rounded-xl"
          />
          <button
            type="button"
            :disabled="isOffline || menuItem.porciones <= 0 || (quantitiesMap[menuItem.id] || 0) >= menuItem.porciones"
            class="px-5 py-2.5 text-sm font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-xl shadow-xs transition disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
            @click="handleAddToOrder"
          >
            {{ isOffline ? 'Bloqueado offline' : 'Agregar al pedido' }}
          </button>
        </div>

        <div class="text-xs text-stone-500 space-y-0.5 text-right">
          <p>Creado: {{ formatDateTime(menuItem.creado_en) }}</p>
          <p>Actualizado: {{ formatDateTime(menuItem.actualizado_en) }}</p>
        </div>
      </div>
    </article>
  </div>
</template>
