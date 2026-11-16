<template>
  <div class="max-w-lg mx-auto bg-white border border-stone-200 rounded-2xl p-8 text-center shadow-xs space-y-4">
    <p class="text-4xl font-extrabold text-amber-800">404</p>
    <h1 class="text-xl font-bold text-stone-900">Ruta no encontrada</h1>
    <p class="text-sm text-stone-600">
      La sección solicitada no existe dentro de esta aplicación SPA.
    </p>
    <RouterLink
      to="/"
      class="inline-block px-5 py-2.5 text-sm font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition"
    >
      Volver al menú
    </RouterLink>
  </div>
</template>
