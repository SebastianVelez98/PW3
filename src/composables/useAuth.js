import { computed, readonly, ref } from 'vue';
import { authService } from '../services/authService.js';

const usuario = ref(null);
const checking = ref(false);
const initialized = ref(false);
let authEpoch = 0;

export function useAuth() {
  const isAuthenticated = computed(() => Boolean(usuario.value));

  async function checkSession({ force = false } = {}) {
    if (initialized.value && !force) return usuario.value;
    const epochAtStart = ++authEpoch;
    checking.value = true;
    try {
      const data = await authService.obtenerSesionActual();
      if (epochAtStart !== authEpoch) return usuario.value;
      usuario.value = data || null;
      return usuario.value;
    } catch (error) {
      if (epochAtStart !== authEpoch) return usuario.value;
      // 401 indica simplemente que no hay sesión activa; no es un fallo crítico.
      if (error?.status === 401) {
        usuario.value = null;
        return null;
      }
      // Si estamos offline o falla la red, conservamos estado seguro (null si no estaba verificado).
      if (!usuario.value) {
        usuario.value = null;
      }
      return usuario.value;
    } finally {
      if (epochAtStart === authEpoch) {
        checking.value = false;
        initialized.value = true;
      }
    }
  }

  async function login(credenciales) {
    authEpoch += 1;
    checking.value = false;
    const data = await authService.login(credenciales);
    usuario.value = data;
    initialized.value = true;
    return data;
  }

  async function logout() {
    authEpoch += 1;
    checking.value = false;
    try {
      await authService.logout();
    } finally {
      usuario.value = null;
      initialized.value = true;
    }
  }

  function clearSessionLocal() {
    authEpoch += 1;
    usuario.value = null;
  }

  return {
    usuario: readonly(usuario),
    checking: readonly(checking),
    initialized: readonly(initialized),
    isAuthenticated,
    checkSession,
    login,
    logout,
    clearSessionLocal
  };
}
