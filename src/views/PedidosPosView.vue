<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import OrderItemRow from '../components/orders/OrderItemRow.vue';
import OrderCheckoutForm from '../components/orders/OrderCheckoutForm.vue';
import OrderTicketCard from '../components/orders/OrderTicketCard.vue';
import StateFeedback from '../components/common/StateFeedback.vue';
import { useOrderCart } from '../composables/useOrderCart.js';
import { useAuth } from '../composables/useAuth.js';
import { useNetworkStatus } from '../composables/useNetworkStatus.js';
import { useToast } from '../composables/useToast.js';
import { pedidosService } from '../services/pedidosService.js';
import { createLatestRequestGuard } from '../services/httpClient.js';
import { formatCurrency } from '../utils/formatters.js';

const router = useRouter();
const toast = useToast();
const { items, totales, isEmpty, updateQuantity, removeItem, clearOrder } = useOrderCart();
const { isAuthenticated, clearSessionLocal } = useAuth();
const { isOffline } = useNetworkStatus();

const pedidos = ref([]);
const resumen = ref({
  totalPedidos: 0,
  pendientesCocina: 0,
  listos: 0,
  entregados: 0,
  recaudacionTotal: 0
});
const pedidosStatus = ref('loading');
const pedidosError = ref(null);

const submitting = ref(false);
const checkoutError = ref('');
const updatingOrderId = ref(null);

const ordersGuard = createLatestRequestGuard();

async function loadPedidos() {
  if (pedidos.value.length === 0) {
    pedidosStatus.value = 'loading';
  }
  pedidosError.value = null;

  try {
    const res = await ordersGuard.run((signal) => pedidosService.listar({ signal }));
    if (res.stale) return;

    pedidos.value = res.value.pedidos;
    resumen.value = res.value.resumen;
    pedidosStatus.value = res.value.pedidos.length === 0 ? 'empty' : 'success';
  } catch (err) {
    pedidosError.value = err;
    pedidosStatus.value = 'error';
  }
}

onMounted(() => {
  loadPedidos();
});

onUnmounted(() => {
  ordersGuard.abort();
});

async function handleCheckout(formData) {
  if (submitting.value || isOffline.value) return;
  submitting.value = true;
  checkoutError.value = '';

  try {
    const res = await pedidosService.crear({
      items: items.value,
      ...formData
    });
    clearOrder();
    toast.success(res.mensaje);
    await loadPedidos();
  } catch (err) {
    if (err?.status === 401) {
      clearSessionLocal();
    }
    checkoutError.value = err?.mensaje || err?.message || 'No se pudo enviar el pedido.';
    toast.error(checkoutError.value);
  } finally {
    submitting.value = false;
  }
}

async function handleAdvanceState({ id, estado }) {
  if (updatingOrderId.value || isOffline.value) return;
  updatingOrderId.value = id;

  try {
    const updated = await pedidosService.actualizarEstado(id, estado);
    toast.success(`Pedido ${updated.ticket} actualizado a ${estado.replace('_', ' ')}.`);
    await loadPedidos();
  } catch (err) {
    if (err?.status === 401) {
      clearSessionLocal();
    }
    toast.error(err?.mensaje || 'No se pudo actualizar el estado del pedido.');
  } finally {
    updatingOrderId.value = null;
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Pedidos POS y Tablero de Barra / Cocina
        </h1>
        <p class="text-sm text-stone-600 mt-1">
          Envía comandas descontando porciones disponibles en la API y gestiona el estado de entrega.
        </p>
      </div>

      <RouterLink
        to="/"
        class="px-4 py-2 text-xs sm:text-sm font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition"
      >
        + Agregar del menú
      </RouterLink>
    </div>

    <!-- Comanda actual + Checkout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <section class="lg:col-span-7 space-y-4">
        <StateFeedback
          v-if="isEmpty"
          state="empty"
          empty-title="Tu comanda está vacía"
          empty-message="Agrega bebidas, panadería o desayunos desde el menú para generar un nuevo pedido."
          action-label="Explorar menú"
          @action="router.push('/')"
        />

        <div v-else class="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
          <h2 class="text-base font-bold text-stone-900 border-b border-stone-100 pb-3 mb-2">
            Detalle de la comanda ({{ items.length }})
          </h2>
          <div>
            <OrderItemRow
              v-for="item in items"
              :key="item.producto.id"
              :item="item"
              :disabled="submitting"
              @update-quantity="updateQuantity"
              @remove="removeItem"
            />
          </div>
        </div>
      </section>

      <aside class="lg:col-span-5">
        <OrderCheckoutForm
          :totales="totales"
          :item-count="items.length"
          :submitting="submitting"
          :is-offline="isOffline"
          :is-authenticated="isAuthenticated"
          :server-error="checkoutError"
          @checkout="handleCheckout"
          @clear-order="clearOrder"
          @go-login="router.push({ path: '/login', query: { redirect: '/pedidos' } })"
        />
      </aside>
    </div>

    <!-- Tablero de tickets / cocina -->
    <section class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-bold text-stone-900">Tickets registrados en el turno</h2>
          <p class="text-xs text-stone-500">
            En preparación: {{ resumen.pendientesCocina }} &middot; Listos: {{ resumen.listos }} &middot; Entregados: {{ resumen.entregados }} &middot; Caja: {{ formatCurrency(resumen.recaudacionTotal) }}
          </p>
        </div>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl transition cursor-pointer"
          @click="loadPedidos"
        >
          Actualizar tablero
        </button>
      </div>

      <StateFeedback
        v-if="pedidosStatus !== 'success'"
        :state="pedidosStatus"
        :error="pedidosError"
        loading-text="Consultando comandas de cocina..."
        empty-title="Sin comandas registradas aún"
        empty-message="Cuando confirmes tu primer pedido, aparecerá aquí para seguimiento en barra."
        @retry="loadPedidos"
      />

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <OrderTicketCard
          v-for="pedido in pedidos"
          :key="pedido.id"
          :pedido="pedido"
          :updating="updatingOrderId === pedido.id"
          :can-advance="isAuthenticated"
          :is-offline="isOffline"
          @advance-state="handleAdvanceState"
        />
      </div>
    </section>
  </div>
</template>
