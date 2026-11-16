<script setup>
import { reactive, ref } from 'vue';
import { formatCurrency } from '../../utils/formatters.js';
import { validatePedidoForm } from '../../utils/validators.js';

const props = defineProps({
  totales: {
    type: Object,
    required: true
  },
  itemCount: {
    type: Number,
    default: 0
  },
  submitting: {
    type: Boolean,
    default: false
  },
  isOffline: {
    type: Boolean,
    default: false
  },
  isAuthenticated: {
    type: Boolean,
    default: false
  },
  serverError: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['checkout', 'clear-order', 'go-login']);

const form = reactive({
  clienteNombre: 'Cliente en Barra',
  tipoServicio: 'En mesa',
  numeroMesa: 'Mesa 4',
  metodoPago: 'Efectivo',
  notas: ''
});

const errors = ref({});

function handleSubmit() {
  const validation = validatePedidoForm(form);
  errors.value = validation.errors;
  if (!validation.valid) return;
  emit('checkout', {
    clienteNombre: form.clienteNombre.trim(),
    tipoServicio: form.tipoServicio,
    numeroMesa: form.tipoServicio === 'En mesa' ? form.numeroMesa.trim() : '',
    metodoPago: form.metodoPago,
    notas: form.notas.trim()
  });
}
</script>

<template>
  <form
    class="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <div class="flex items-center justify-between border-b border-stone-100 pb-3">
      <h2 class="text-base font-bold text-stone-900">Enviar Comanda a Barra / Cocina</h2>
      <button
        v-if="itemCount > 0"
        type="button"
        :disabled="submitting"
        class="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
        @click="$emit('clear-order')"
      >
        Limpiar pedido
      </button>
    </div>

    <div class="space-y-3">
      <div>
        <label for="order-cliente" class="block text-xs font-semibold text-stone-700 mb-1">
          Nombre del cliente / comensal *
        </label>
        <input
          id="order-cliente"
          v-model="form.clienteNombre"
          type="text"
          class="w-full px-3.5 py-2 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
          :class="errors.clienteNombre ? 'border-rose-400' : 'border-stone-200 focus:border-amber-700'"
        />
        <p v-if="errors.clienteNombre" class="mt-1 text-xs text-rose-600">{{ errors.clienteNombre }}</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label for="order-servicio" class="block text-xs font-semibold text-stone-700 mb-1">
            Modalidad *
          </label>
          <select
            id="order-servicio"
            v-model="form.tipoServicio"
            class="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
          >
            <option value="En mesa">En mesa</option>
            <option value="Para llevar">Para llevar</option>
            <option value="Domicilio">Domicilio</option>
          </select>
        </div>

        <div v-if="form.tipoServicio === 'En mesa'">
          <label for="order-mesa" class="block text-xs font-semibold text-stone-700 mb-1">
            Mesa *
          </label>
          <input
            id="order-mesa"
            v-model="form.numeroMesa"
            type="text"
            placeholder="Ej. Mesa 4"
            class="w-full px-3.5 py-2 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
            :class="errors.numeroMesa ? 'border-rose-400' : 'border-stone-200 focus:border-amber-700'"
          />
          <p v-if="errors.numeroMesa" class="mt-1 text-xs text-rose-600">{{ errors.numeroMesa }}</p>
        </div>

        <div :class="form.tipoServicio === 'En mesa' ? 'sm:col-span-2' : ''">
          <label for="order-pago" class="block text-xs font-semibold text-stone-700 mb-1">
            Método de pago *
          </label>
          <select
            id="order-pago"
            v-model="form.metodoPago"
            class="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
          >
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Transferencia">Transferencia</option>
          </select>
        </div>
      </div>

      <div>
        <label for="order-notas" class="block text-xs font-semibold text-stone-700 mb-1">
          Notas para barista / cocina (opcional)
        </label>
        <input
          id="order-notas"
          v-model="form.notas"
          type="text"
          placeholder="Ej. Leche de almendras, sin azúcar, poco hielo..."
          class="w-full px-3.5 py-2 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
          :class="errors.notas ? 'border-rose-400' : 'border-stone-200 focus:border-amber-700'"
        />
        <p v-if="errors.notas" class="mt-1 text-xs text-rose-600">{{ errors.notas }}</p>
      </div>
    </div>

    <div class="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1.5 text-sm">
      <div class="flex justify-between text-stone-600">
        <span>Unidades / Prep. estimada</span>
        <span class="font-semibold tabular-nums">
          {{ totales.totalUnidades }} uds. &middot; ~{{ totales.tiempoEstimadoMin }} min
        </span>
      </div>
      <div class="flex justify-between text-stone-600">
        <span>Subtotal</span>
        <span class="font-semibold tabular-nums">{{ formatCurrency(totales.subtotal) }}</span>
      </div>
      <div class="flex justify-between text-stone-600">
        <span>IVA (15%)</span>
        <span class="font-semibold tabular-nums">{{ formatCurrency(totales.impuesto) }}</span>
      </div>
      <div class="flex justify-between text-base font-extrabold text-stone-900 pt-2 border-t border-stone-200">
        <span>Total del pedido</span>
        <span class="text-amber-800 tabular-nums">{{ formatCurrency(totales.total) }}</span>
      </div>
    </div>

    <p v-if="serverError" role="alert" class="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
      {{ serverError }}
    </p>

    <div v-if="!isAuthenticated" class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 space-y-2">
      <p>
        Para enviar pedidos a cocina y descontar porciones en la API (<code>POST /api/pedidos</code>), inicia turno como barista.
      </p>
      <button
        type="button"
        class="w-full py-2 font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-lg transition cursor-pointer"
        @click="$emit('go-login')"
      >
        Iniciar turno
      </button>
    </div>

    <button
      v-else
      type="submit"
      :disabled="itemCount === 0 || submitting || isOffline"
      class="w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
    >
      {{
        isOffline
          ? 'Pedidos bloqueados sin conexión'
          : submitting
            ? 'Registrando pedido en cocina...'
            : 'Confirmar y enviar pedido'
      }}
    </button>
  </form>
</template>
