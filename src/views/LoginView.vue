<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth.js';
import { useNetworkStatus } from '../composables/useNetworkStatus.js';
import { useToast } from '../composables/useToast.js';
import { validateLoginForm } from '../utils/validators.js';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { usuario, isAuthenticated, login, logout } = useAuth();
const { isOffline } = useNetworkStatus();

const form = reactive({
  username: '',
  password: ''
});
const localErrors = ref({});
const serverError = ref('');
const submitting = ref(false);

function fillDemoCredentials() {
  form.username = 'barista';
  form.password = 'cafe123';
  localErrors.value = {};
  serverError.value = '';
}

async function handleLogin() {
  const val = validateLoginForm(form);
  localErrors.value = val.errors;
  serverError.value = '';
  if (!val.valid || submitting.value) return;

  submitting.value = true;
  try {
    const user = await login(form);
    toast.success(`Turno iniciado: ${user.nombre}.`);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    router.push(redirect);
  } catch (err) {
    serverError.value = err?.mensaje || 'No se pudo iniciar turno.';
  } finally {
    submitting.value = false;
  }
}

async function handleLogout() {
  await logout();
  toast.info('Turno cerrado correctamente.');
}
</script>

<template>
  <div class="max-w-md mx-auto py-4">
    <div v-if="isAuthenticated" class="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-5">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold text-lg">
          {{ usuario?.username?.slice(0, 2).toUpperCase() }}
        </div>
        <div>
          <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            Turno activo
          </span>
          <h1 class="text-lg font-bold text-stone-900 mt-1">{{ usuario?.nombre }}</h1>
          <p class="text-xs text-stone-500">Usuario: {{ usuario?.username }} &middot; Rol: {{ usuario?.rol }}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        <RouterLink
          to="/carta"
          class="text-center py-2.5 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition"
        >
          Gestionar Carta
        </RouterLink>
        <RouterLink
          to="/pedidos"
          class="text-center py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
        >
          Ir a Pedidos POS
        </RouterLink>
      </div>

      <button
        type="button"
        class="w-full py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
        @click="handleLogout"
      >
        Cerrar turno (POST /api/auth/logout)
      </button>
    </div>

    <form
      v-else
      class="bg-white border border-stone-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5"
      novalidate
      @submit.prevent="handleLogin"
    >
      <div>
        <h1 class="text-xl font-extrabold text-stone-900">Iniciar turno en AromaPOS</h1>
        <p class="text-xs text-stone-500 mt-1">
          Autenticación por cookie <code>httpOnly</code> contra <code>POST /api/auth/login</code>.
        </p>
      </div>

      <div
        v-if="serverError"
        role="alert"
        class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700"
      >
        {{ serverError }}
      </div>

      <div class="space-y-3.5">
        <div>
          <label for="login-user" class="block text-xs font-semibold text-stone-700 mb-1">
            Usuario
          </label>
          <input
            id="login-user"
            v-model="form.username"
            type="text"
            autocomplete="username"
            placeholder="barista"
            class="w-full px-3.5 py-2.5 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
            :class="localErrors.username ? 'border-rose-400' : 'border-stone-200 focus:border-amber-700'"
          />
          <p v-if="localErrors.username" class="mt-1 text-xs text-rose-600">{{ localErrors.username }}</p>
        </div>

        <div>
          <label for="login-pass" class="block text-xs font-semibold text-stone-700 mb-1">
            Contraseña
          </label>
          <input
            id="login-pass"
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            class="w-full px-3.5 py-2.5 text-sm bg-stone-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/25"
            :class="localErrors.password ? 'border-rose-400' : 'border-stone-200 focus:border-amber-700'"
          />
          <p v-if="localErrors.password" class="mt-1 text-xs text-rose-600">{{ localErrors.password }}</p>
        </div>
      </div>

      <button
        type="submit"
        :disabled="submitting || isOffline"
        class="w-full py-2.5 text-sm font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-xl shadow-xs transition disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
      >
        {{ isOffline ? 'Requiere conexión a internet' : submitting ? 'Verificando...' : 'Iniciar turno' }}
      </button>

      <div class="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
        <div class="text-stone-600">
          <p class="font-semibold text-stone-800">Acceso personal cafetería:</p>
          <p><code>barista</code> / <code>cafe123</code></p>
        </div>
        <button
          type="button"
          class="px-3 py-1.5 font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition cursor-pointer"
          @click="fillDemoCredentials"
        >
          Autocompletar
        </button>
      </div>
    </form>
  </div>
</template>
