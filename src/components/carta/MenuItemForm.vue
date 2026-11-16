<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { formatCurrency } from '../../utils/formatters.js';
import { mapServerValidationErrors, validateMenuForm } from '../../utils/validators.js';

const props = defineProps({
  initialItem: {
    type: Object,
    default: null
  },
  submitting: {
    type: Boolean,
    default: false
  },
  serverError: {
    type: Object,
    default: null
  },
  isOffline: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['submit', 'cancel']);

const form = reactive({
  codigo: '',
  nombre: '',
  descripcion: '',
  categoria: 'Café de Especialidad',
  precio: '',
  porciones: 12,
  tiempoPreparacion: 4
});

const localErrors = ref({});
const isEditMode = computed(() => Boolean(props.initialItem?.id));

watch(
  () => props.initialItem,
  (item) => {
    localErrors.value = {};
    if (item) {
      form.codigo = item.codigo || '';
      form.nombre = item.nombre || '';
      form.descripcion = item.descripcion || '';
      form.categoria = item.categoria || 'Café de Especialidad';
      form.precio = item.precio ?? '';
      form.porciones = item.porciones ?? 0;
      form.tiempoPreparacion = item.tiempoPreparacion ?? 4;
    } else {
      form.codigo = '';
      form.nombre = '';
      form.descripcion = '';
      form.categoria = 'Café de Especialidad';
      form.precio = '';
      form.porciones = 12;
      form.tiempoPreparacion = 4;
    }
  },
  { immediate: true }
);

const mergedErrors = computed(() => ({
  ...localErrors.value,
  ...mapServerValidationErrors(props.serverError)
}));

const ivaPreview = computed(() => {
  const p = Number(form.precio);
  if (Number.isNaN(p) || p <= 0) return { iva: 0, total: 0 };
  const iva = Number((p * 0.15).toFixed(2));
  return { iva, total: Number((p + iva).toFixed(2)) };
});

function handleSubmit() {
  const result = validateMenuForm(form);
  localErrors.value = result.errors;
  if (!result.valid) return;
  emit('submit', result.sanitized);
}
</script>

<template>
  <form
    class="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <div class="flex items-center justify-between border-b border-stone-100 pb-3">
      <div>
        <h2 class="text-lg font-bold text-stone-900">
          {{ isEditMode ? `Editar ítem #${initialItem.id}` : 'Agregar nuevo ítem a la carta' }}
        </h2>
        <p class="text-xs text-stone-500">
          Validado en cliente y en el servidor API de AromaPOS.
        </p>
      </div>
      <button
        v-if="isEditMode"
        type="button"
        class="text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
        @click="$emit('cancel')"
      >
        Cancelar edición
      </button>
    </div>

    <div
      v-if="serverError"
      role="alert"
      class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800"
    >
      <p class="font-bold">
        [{{ serverError.codigo || `HTTP ${serverError.status}` }}] {{ serverError.mensaje }}
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label for="menu-codigo" class="block text-xs font-semibold text-stone-700 mb-1">
          Código de carta *
        </label>
        <input
          id="menu-codigo"
          v-model="form.codigo"
          type="text"
          placeholder="Ej. CAF-CAP-07"
          class="w-full px-3.5 py-2 text-sm font-mono uppercase bg-stone-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
          :class="mergedErrors.codigo ? 'border-rose-400' : 'border-stone-200 focus:border-amber-700'"
        />
        <p v-if="mergedErrors.codigo" class="mt-1 text-xs text-rose-600">{{ mergedErrors.codigo }}</p>
      </div>

      <div class="sm:col-span-1 lg:col-span-2">
        <label for="menu-categoria" class="block text-xs font-semibold text-stone-700 mb-1">
          Categoría *
        </label>
        <input
          id="menu-categoria"
          v-model="form.categoria"
          list="categorias-cafe"
          type="text"
          placeholder="Ej. Café de Especialidad"
          class="w-full px-3.5 py-2 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
          :class="mergedErrors.categoria ? 'border-rose-400' : 'border-stone-200 focus:border-amber-700'"
        />
        <datalist id="categorias-cafe">
          <option value="Café de Especialidad" />
          <option value="Bebidas Frías" />
          <option value="Panadería" />
          <option value="Desayunos" />
          <option value="Postres" />
        </datalist>
        <p v-if="mergedErrors.categoria" class="mt-1 text-xs text-rose-600">{{ mergedErrors.categoria }}</p>
      </div>

      <div class="sm:col-span-2 lg:col-span-3">
        <label for="menu-nombre" class="block text-xs font-semibold text-stone-700 mb-1">
          Nombre del plato o bebida *
        </label>
        <input
          id="menu-nombre"
          v-model="form.nombre"
          type="text"
          placeholder="Ej. Cappuccino Doble con Canela"
          class="w-full px-3.5 py-2 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
          :class="mergedErrors.nombre ? 'border-rose-400' : 'border-stone-200 focus:border-amber-700'"
        />
        <p v-if="mergedErrors.nombre" class="mt-1 text-xs text-rose-600">{{ mergedErrors.nombre }}</p>
      </div>

      <div class="sm:col-span-2 lg:col-span-3">
        <label for="menu-descripcion" class="block text-xs font-semibold text-stone-700 mb-1">
          Ingredientes / Descripción
        </label>
        <textarea
          id="menu-descripcion"
          v-model="form.descripcion"
          rows="2"
          placeholder="Notas de cata, preparación o alérgenos..."
          class="w-full px-3.5 py-2 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
          :class="mergedErrors.descripcion ? 'border-rose-400' : 'border-stone-200 focus:border-amber-700'"
        ></textarea>
        <p v-if="mergedErrors.descripcion" class="mt-1 text-xs text-rose-600">
          {{ mergedErrors.descripcion }}
        </p>
      </div>

      <div>
        <label for="menu-precio" class="block text-xs font-semibold text-stone-700 mb-1">
          Precio neto (USD) *
        </label>
        <input
          id="menu-precio"
          v-model="form.precio"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="4.50"
          class="w-full px-3.5 py-2 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
          :class="mergedErrors.precio ? 'border-rose-400' : 'border-stone-200 focus:border-amber-700'"
        />
        <p v-if="mergedErrors.precio" class="mt-1 text-xs text-rose-600">{{ mergedErrors.precio }}</p>
      </div>

      <div>
        <label for="menu-porciones" class="block text-xs font-semibold text-stone-700 mb-1">
          Porciones disponibles *
        </label>
        <input
          id="menu-porciones"
          v-model="form.porciones"
          type="number"
          step="1"
          min="0"
          class="w-full px-3.5 py-2 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
          :class="mergedErrors.porciones ? 'border-rose-400' : 'border-stone-200 focus:border-amber-700'"
        />
        <p v-if="mergedErrors.porciones" class="mt-1 text-xs text-rose-600">{{ mergedErrors.porciones }}</p>
      </div>

      <div>
        <label for="menu-tiempo" class="block text-xs font-semibold text-stone-700 mb-1">
          Tiempo prep. (min) *
        </label>
        <input
          id="menu-tiempo"
          v-model="form.tiempoPreparacion"
          type="number"
          step="1"
          min="1"
          max="120"
          class="w-full px-3.5 py-2 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
          :class="mergedErrors.tiempoPreparacion ? 'border-rose-400' : 'border-stone-200 focus:border-amber-700'"
        />
        <p v-if="mergedErrors.tiempoPreparacion" class="mt-1 text-xs text-rose-600">
          {{ mergedErrors.tiempoPreparacion }}
        </p>
      </div>
    </div>

    <div class="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span class="text-stone-600">PVP sugerido con IVA (15%):</span>
      <div class="flex items-center gap-4 font-semibold text-stone-800">
        <span>IVA: {{ formatCurrency(ivaPreview.iva) }}</span>
        <span class="text-amber-800">Total al cliente: {{ formatCurrency(ivaPreview.total) }}</span>
      </div>
    </div>

    <div class="flex items-center justify-end gap-2.5 pt-2">
      <button
        type="button"
        class="px-4 py-2 text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer"
        @click="$emit('cancel')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="submitting || isOffline"
        class="px-5 py-2 text-sm font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
      >
        {{
          isOffline
            ? 'Bloqueado sin conexión'
            : submitting
              ? 'Guardando...'
              : isEditMode
                ? 'Guardar cambios'
                : 'Publicar en carta'
        }}
      </button>
    </div>
  </form>
</template>
