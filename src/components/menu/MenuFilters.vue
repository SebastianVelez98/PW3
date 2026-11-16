<script setup>
defineProps({
  busqueda: {
    type: String,
    default: ''
  },
  categoria: {
    type: String,
    default: ''
  },
  categorias: {
    type: Array,
    default: () => []
  },
  viewMode: {
    type: String,
    default: 'grid'
  },
  fetching: {
    type: Boolean,
    default: false
  }
});

defineEmits(['update:busqueda', 'update:categoria', 'update:viewMode', 'reset']);
</script>

<template>
  <form
    class="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center gap-3"
    @submit.prevent
  >
    <div class="relative flex-1">
      <svg
        class="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        :value="busqueda"
        type="search"
        placeholder="Buscar bebidas, platos, código o ingredientes..."
        aria-label="Buscar en el menú"
        class="w-full pl-10 pr-24 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25 focus:border-amber-700 transition"
        @input="$emit('update:busqueda', $event.target.value)"
      />
      <span
        v-if="fetching"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md"
      >
        Sincronizando...
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-2.5">
      <select
        :value="categoria"
        aria-label="Filtrar por categoría"
        class="px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25 focus:border-amber-700 transition"
        @change="$emit('update:categoria', $event.target.value)"
      >
        <option value="">Todas las categorías</option>
        <option v-for="cat in categorias" :key="cat" :value="cat">
          {{ cat }}
        </option>
      </select>

      <button
        v-if="busqueda || categoria"
        type="button"
        class="px-3 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer"
        @click="$emit('reset')"
      >
        Limpiar
      </button>

      <div class="inline-flex rounded-xl border border-stone-200 bg-stone-100 p-1">
        <button
          type="button"
          class="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          :class="viewMode === 'grid' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'"
          @click="$emit('update:viewMode', 'grid')"
        >
          Tarjetas
        </button>
        <button
          type="button"
          class="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          :class="viewMode === 'table' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'"
          @click="$emit('update:viewMode', 'table')"
        >
          Lista
        </button>
      </div>
    </div>
  </form>
</template>
