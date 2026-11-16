<script setup>
import { formatCurrency } from '../../utils/formatters.js';

defineProps({
  metricas: {
    type: Object,
    default: () => ({
      totalProductos: 0,
      totalPorciones: 0,
      valorTotalMenu: 0,
      platosConStockBajo: 0
    })
  },
  loading: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <section class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-label="Resumen de carta">
    <article class="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
      <p class="text-xs font-semibold uppercase tracking-wider text-stone-500">Platos y Bebidas</p>
      <p class="mt-1.5 text-2xl sm:text-3xl font-extrabold text-stone-900 tabular-nums">
        {{ loading ? '—' : metricas.totalProductos }}
      </p>
      <p class="mt-1 text-xs text-stone-500">Opciones en carta</p>
    </article>

    <article class="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
      <p class="text-xs font-semibold uppercase tracking-wider text-stone-500">Porciones del Día</p>
      <p class="mt-1.5 text-2xl sm:text-3xl font-extrabold text-emerald-700 tabular-nums">
        {{ loading ? '—' : metricas.totalPorciones }}
      </p>
      <p class="mt-1 text-xs text-stone-500">Unidades listas para servir</p>
    </article>

    <article class="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
      <p class="text-xs font-semibold uppercase tracking-wider text-stone-500">Valor Proyectado</p>
      <p class="mt-1.5 text-2xl sm:text-3xl font-extrabold text-amber-800 tabular-nums">
        {{ loading ? '—' : formatCurrency(metricas.valorTotalMenu) }}
      </p>
      <p class="mt-1 text-xs text-stone-500">Carta del turno (neto)</p>
    </article>

    <article
      class="border rounded-2xl p-4 sm:p-5 shadow-2xs"
      :class="
        metricas.platosConStockBajo > 0
          ? 'bg-amber-50/70 border-amber-200'
          : 'bg-white border-stone-200'
      "
    >
      <p class="text-xs font-semibold uppercase tracking-wider text-stone-500">Por Agotarse ≤ 5</p>
      <p
        class="mt-1.5 text-2xl sm:text-3xl font-extrabold tabular-nums"
        :class="metricas.platosConStockBajo > 0 ? 'text-amber-800' : 'text-stone-900'"
      >
        {{ loading ? '—' : metricas.platosConStockBajo }}
      </p>
      <p class="mt-1 text-xs text-stone-500">Requieren reposición en barra</p>
    </article>
  </section>
</template>
