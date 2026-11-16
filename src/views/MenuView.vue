<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import MenuMetrics from '../components/menu/MenuMetrics.vue';
import MenuFilters from '../components/menu/MenuFilters.vue';
import MenuList from '../components/menu/MenuList.vue';
import StateFeedback from '../components/common/StateFeedback.vue';
import { menuService } from '../services/menuService.js';
import { createLatestRequestGuard } from '../services/httpClient.js';
import { useOrderCart } from '../composables/useOrderCart.js';
import { setCacheIndicator, useNetworkStatus } from '../composables/useNetworkStatus.js';
import { useToast } from '../composables/useToast.js';
import { formatCurrency } from '../utils/formatters.js';

const router = useRouter();
const toast = useToast();
const { isOffline } = useNetworkStatus();
const { items, totales, quantitiesMap, addItem, syncMenuSnapshot } = useOrderCart();

const menuItems = ref([]);
const metricas = ref({
  totalProductos: 0,
  totalPorciones: 0,
  valorTotalMenu: 0,
  platosConStockBajo: 0
});
const categoriasDisponibles = ref([]);
const busqueda = ref('');
const categoria = ref('');
const viewMode = ref('grid');

const status = ref('loading'); // loading | success | empty | error
const fetching = ref(false);
const error = ref(null);

const requestGuard = createLatestRequestGuard();
let debounceTimer = null;

async function fetchMenu({ initial = false } = {}) {
  if (initial && menuItems.value.length === 0) {
    status.value = 'loading';
  }
  fetching.value = true;
  error.value = null;

  try {
    const res = await requestGuard.run((signal) =>
      menuService.listar(
        { busqueda: busqueda.value, categoria: categoria.value },
        { signal }
      )
    );

    if (res.stale) return;

    const result = res.value;
    menuItems.value = result.items;
    metricas.value = result.metricas;
    setCacheIndicator({
      fromOfflineCache: result.fromOfflineCache,
      cachedAt: result.cachedAt
    });

    if (!categoria.value && !busqueda.value) {
      categoriasDisponibles.value = Array.from(
        new Set(result.items.map((p) => p.categoria).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));
      syncMenuSnapshot(result.items);
    } else {
      const merged = new Set([
        ...categoriasDisponibles.value,
        ...result.items.map((p) => p.categoria).filter(Boolean)
      ]);
      categoriasDisponibles.value = Array.from(merged).sort((a, b) => a.localeCompare(b));
    }

    status.value = result.items.length === 0 ? 'empty' : 'success';
  } catch (err) {
    error.value = err;
    status.value = 'error';
  } finally {
    fetching.value = false;
  }
}

watch([busqueda, categoria], () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchMenu();
  }, 220);
});

onMounted(() => {
  fetchMenu({ initial: true });
});

onUnmounted(() => {
  clearTimeout(debounceTimer);
  requestGuard.abort();
});

const emptyMessage = computed(() => {
  if (busqueda.value || categoria.value) {
    return 'No hay bebidas ni platos que coincidan con tu búsqueda o categoría seleccionada.';
  }
  return 'Aún no hay platos o bebidas publicados en la carta de hoy.';
});

function handleResetFilters() {
  busqueda.value = '';
  categoria.value = '';
}

function handleAddToOrder(item) {
  const result = addItem(item, 1);
  if (!result.ok) {
    toast.warning(result.reason);
    return;
  }
  toast.success(`"${item.nombre}" agregado a la comanda (${result.cantidad}).`);
}

function handleViewDetail(id) {
  router.push(`/menu/${id}`);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Cabecera -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Carta del Día y Toma de Pedidos
        </h1>
        <p class="text-sm text-stone-600 mt-1">
          Consulta bebidas, panadería y desayunos en tiempo real, filtra sin condiciones de carrera y envía comandas a barra.
        </p>
      </div>

      <RouterLink
        to="/pedidos"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-800 hover:bg-amber-900 text-white shadow-xs transition shrink-0"
      >
        <span>Ir a Pedidos POS</span>
        <span class="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
          {{ totales.totalUnidades }} &middot; {{ formatCurrency(totales.total) }}
        </span>
      </RouterLink>
    </div>

    <!-- Métricas -->
    <MenuMetrics :metricas="metricas" :loading="status === 'loading'" />

    <!-- Filtros -->
    <MenuFilters
      v-model:busqueda="busqueda"
      v-model:categoria="categoria"
      v-model:view-mode="viewMode"
      :categorias="categoriasDisponibles"
      :fetching="fetching"
      @reset="handleResetFilters"
    />

    <!-- Contenido + Comanda rápida -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div :class="items.length > 0 ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'">
        <StateFeedback
          v-if="status !== 'success'"
          :state="status"
          :error="error"
          loading-text="Consultando carta de cafetería..."
          empty-title="Sin platos encontrados"
          :empty-message="emptyMessage"
          :action-label="busqueda || categoria ? 'Limpiar filtros' : 'Ir a Gestión de Carta'"
          @retry="fetchMenu({ initial: true })"
          @action="busqueda || categoria ? handleResetFilters() : router.push('/carta')"
        />

        <MenuList
          v-else
          :items="menuItems"
          :order-quantities="quantitiesMap"
          :view-mode="viewMode"
          :is-offline="isOffline"
          @add-to-order="handleAddToOrder"
          @view-detail="handleViewDetail"
        />
      </div>

      <!-- Comanda rápida lateral -->
      <aside
        v-if="items.length > 0"
        class="lg:col-span-4 xl:col-span-3 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs sticky top-20 space-y-4"
      >
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <h2 class="text-sm font-bold text-stone-900">Comanda actual</h2>
          <span class="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
            {{ totales.totalUnidades }} uds. &middot; ~{{ totales.tiempoEstimadoMin }}m
          </span>
        </div>

        <ul class="space-y-2.5 text-xs">
          <li
            v-for="item in items"
            :key="item.producto.id"
            class="flex items-center justify-between gap-2"
          >
            <span class="text-stone-700 truncate">
              <strong>{{ item.cantidad }}x</strong> {{ item.producto.nombre }}
            </span>
            <span class="font-semibold text-stone-900 tabular-nums shrink-0">
              {{ formatCurrency(item.producto.precio * item.cantidad) }}
            </span>
          </li>
        </ul>

        <div class="pt-3 border-t border-stone-100 space-y-1 text-xs">
          <div class="flex justify-between text-stone-500">
            <span>Subtotal</span>
            <span>{{ formatCurrency(totales.subtotal) }}</span>
          </div>
          <div class="flex justify-between text-stone-500">
            <span>IVA (15%)</span>
            <span>{{ formatCurrency(totales.impuesto) }}</span>
          </div>
          <div class="flex justify-between text-sm font-extrabold text-stone-900 pt-1">
            <span>Total</span>
            <span class="text-amber-800">{{ formatCurrency(totales.total) }}</span>
          </div>
        </div>

        <RouterLink
          to="/pedidos"
          class="block w-full text-center py-2.5 px-4 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition"
        >
          Confirmar pedido en POS
        </RouterLink>
      </aside>
    </div>
  </div>
</template>
