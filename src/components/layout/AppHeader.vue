<script setup>
defineProps({
  isOffline: {
    type: Boolean,
    default: false
  },
  canInstall: {
    type: Boolean,
    default: false
  },
  swUpdateAvailable: {
    type: Boolean,
    default: false
  },
  orderCount: {
    type: Number,
    default: 0
  },
  usuario: {
    type: Object,
    default: null
  }
});

defineEmits(['install-pwa', 'apply-update', 'logout']);
</script>

<template>
  <header class="bg-white/95 backdrop-blur border-b border-stone-200 sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="h-16 flex items-center justify-between gap-3">
        <!-- Marca -->
        <RouterLink to="/" class="flex items-center gap-2.5 group shrink-0">
          <div
            class="w-9 h-9 rounded-xl bg-amber-800 text-amber-50 flex items-center justify-center shadow-sm shadow-amber-900/15 group-hover:bg-amber-900 transition"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-stone-900 tracking-tight text-base leading-none">AromaPOS</span>
              <span
                class="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase"
              >
                Cafetería PWA
              </span>
            </div>
            <p class="text-[11px] text-stone-500 hidden sm:block">Carta, Pedidos &amp; Cocina</p>
          </div>
        </RouterLink>

        <!-- Navegación principal desktop -->
        <nav class="hidden md:flex items-center gap-1" aria-label="Navegación principal">
          <RouterLink
            to="/"
            class="px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition"
            active-class="!bg-amber-50 !text-amber-900 !font-semibold"
          >
            Menú
          </RouterLink>
          <RouterLink
            to="/pedidos"
            class="px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition inline-flex items-center gap-1.5"
            active-class="!bg-amber-50 !text-amber-900 !font-semibold"
          >
            <span>Pedidos POS</span>
            <span
              v-if="orderCount > 0"
              class="px-1.5 py-0.5 text-[11px] leading-none font-bold rounded-full bg-amber-700 text-white"
            >
              {{ orderCount }}
            </span>
          </RouterLink>
          <RouterLink
            to="/carta"
            class="px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition"
            active-class="!bg-amber-50 !text-amber-900 !font-semibold"
          >
            Gestión Carta
          </RouterLink>
        </nav>

        <!-- Estado red, PWA y Sesión -->
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
            :class="
              isOffline
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            "
          >
            <span
              class="w-2 h-2 rounded-full"
              :class="isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'"
            ></span>
            <span class="hidden sm:inline">{{ isOffline ? 'Offline' : 'En línea' }}</span>
          </span>

          <button
            v-if="swUpdateAvailable"
            type="button"
            class="px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition cursor-pointer"
            @click="$emit('apply-update')"
          >
            Actualizar app
          </button>

          <button
            v-if="canInstall"
            type="button"
            class="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
            @click="$emit('install-pwa')"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Instalar</span>
          </button>

          <div v-if="usuario" class="flex items-center gap-2">
            <span
              class="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 text-xs font-semibold"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-amber-700"></span>
              {{ usuario.username }}
            </span>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition cursor-pointer"
              @click="$emit('logout')"
            >
              Salir
            </button>
          </div>
          <RouterLink
            v-else
            to="/login"
            class="px-3 py-1.5 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-lg shadow-xs transition"
          >
            Iniciar turno
          </RouterLink>
        </div>
      </div>

      <!-- Navegación móvil -->
      <nav class="flex md:hidden items-center gap-1 pb-2.5 overflow-x-auto" aria-label="Navegación móvil">
        <RouterLink
          to="/"
          class="px-3 py-1 rounded-lg text-xs font-medium text-stone-600 bg-stone-100 whitespace-nowrap"
          active-class="!bg-amber-800 !text-white !font-semibold"
        >
          Menú
        </RouterLink>
        <RouterLink
          to="/pedidos"
          class="px-3 py-1 rounded-lg text-xs font-medium text-stone-600 bg-stone-100 whitespace-nowrap inline-flex items-center gap-1"
          active-class="!bg-amber-800 !text-white !font-semibold"
        >
          <span>Pedidos POS</span>
          <span v-if="orderCount > 0" class="px-1.5 rounded-full bg-white/20 text-[10px] font-bold">
            {{ orderCount }}
          </span>
        </RouterLink>
        <RouterLink
          to="/carta"
          class="px-3 py-1 rounded-lg text-xs font-medium text-stone-600 bg-stone-100 whitespace-nowrap"
          active-class="!bg-amber-800 !text-white !font-semibold"
        >
          Gestión Carta
        </RouterLink>
        <RouterLink
          to="/login"
          class="px-3 py-1 rounded-lg text-xs font-medium text-stone-600 bg-stone-100 whitespace-nowrap"
          active-class="!bg-amber-800 !text-white !font-semibold"
        >
          Turno
        </RouterLink>
      </nav>
    </div>
  </header>
</template>
