<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import MenuItemForm from '../components/carta/MenuItemForm.vue';
import MenuList from '../components/menu/MenuList.vue';
import StateFeedback from '../components/common/StateFeedback.vue';
import ConfirmDialog from '../components/common/ConfirmDialog.vue';
import { menuService } from '../services/menuService.js';
import { createLatestRequestGuard } from '../services/httpClient.js';
import { useAuth } from '../composables/useAuth.js';
import { setCacheIndicator, useNetworkStatus } from '../composables/useNetworkStatus.js';
import { useToast } from '../composables/useToast.js';

const router = useRouter();
const toast = useToast();
const { isAuthenticated, clearSessionLocal } = useAuth();
const { isOffline } = useNetworkStatus();

const menuItems = ref([]);
const status = ref('loading');
const error = ref(null);
const showForm = ref(false);
const editingItem = ref(null);
const submitting = ref(false);
const formServerError = ref(null);

const deleteTarget = ref(null);
const deleting = ref(false);

const guard = createLatestRequestGuard();
const csvExportUrl = computed(() => menuService.getExportCsvUrl());

async function loadCarta() {
  status.value = 'loading';
  error.value = null;

  try {
    const res = await guard.run((signal) => menuService.listar({}, { signal }));
    if (res.stale) return;

    menuItems.value = res.value.items;
    setCacheIndicator({
      fromOfflineCache: res.value.fromOfflineCache,
      cachedAt: res.value.cachedAt
    });
    status.value = res.value.items.length === 0 ? 'empty' : 'success';
  } catch (err) {
    error.value = err;
    status.value = 'error';
  }
}

onMounted(() => {
  loadCarta();
});

onUnmounted(() => {
  guard.abort();
});

function openCreateForm() {
  editingItem.value = null;
  formServerError.value = null;
  showForm.value = true;
}

function openEditForm(item) {
  editingItem.value = item;
  formServerError.value = null;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingItem.value = null;
  formServerError.value = null;
}

async function handleFormSubmit(payload) {
  if (submitting.value) return;
  submitting.value = true;
  formServerError.value = null;

  try {
    if (editingItem.value?.id) {
      await menuService.actualizar(editingItem.value.id, payload);
      toast.success(`"${payload.nombre}" actualizado en la carta.`);
    } else {
      await menuService.crear(payload);
      toast.success(`"${payload.nombre}" publicado en la carta.`);
    }
    closeForm();
    await loadCarta();
  } catch (err) {
    formServerError.value = err;
    if (err.status === 401) {
      clearSessionLocal();
      toast.error('Tu sesión expiró o no has iniciado turno.');
    } else {
      toast.error(err.mensaje || 'Error al guardar el ítem.');
    }
  } finally {
    submitting.value = false;
  }
}

function askDelete(item) {
  deleteTarget.value = item;
}

async function confirmDelete() {
  if (!deleteTarget.value || deleting.value) return;
  deleting.value = true;
  const target = deleteTarget.value;

  try {
    const res = await menuService.eliminar(target.id);
    toast.success(res.mensaje);
    deleteTarget.value = null;
    if (editingItem.value?.id === target.id) {
      closeForm();
    }
    await loadCarta();
  } catch (err) {
    if (err.status === 401) {
      clearSessionLocal();
    }
    toast.error(err.mensaje || 'No se pudo retirar el ítem.');
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Gestión de Carta del Día (CRUD)
        </h1>
        <p class="text-sm text-stone-600 mt-1">
          Administra bebidas, panadería y porciones disponibles; las mutaciones requieren turno iniciado.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <a
          v-if="!isOffline"
          :href="csvExportUrl"
          download
          class="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl shadow-2xs transition"
        >
          Exportar CSV
        </a>
        <button
          v-else
          type="button"
          disabled
          class="px-3.5 py-2 text-xs font-semibold text-stone-400 bg-stone-100 border border-stone-200 rounded-xl cursor-not-allowed"
        >
          CSV no disponible offline
        </button>

        <button
          type="button"
          :disabled="!isAuthenticated || isOffline"
          class="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-xl shadow-xs transition disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
          @click="showForm ? closeForm() : openCreateForm()"
        >
          {{ showForm ? 'Cerrar formulario' : '+ Nuevo plato / bebida' }}
        </button>
      </div>
    </div>

    <!-- Aviso sesión -->
    <div
      v-if="!isAuthenticated"
      class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-sm text-amber-950"
    >
      <p>
        <strong>Modo lectura:</strong> La API protege <code>POST</code>, <code>PUT</code> y <code>DELETE</code> con cookies de sesión. Inicia turno como barista para editar la carta.
      </p>
      <button
        type="button"
        class="px-4 py-2 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition cursor-pointer"
        @click="router.push({ path: '/login', query: { redirect: '/carta' } })"
      >
        Iniciar turno
      </button>
    </div>

    <MenuItemForm
      v-if="showForm"
      :initial-item="editingItem"
      :submitting="submitting"
      :server-error="formServerError"
      :is-offline="isOffline"
      @submit="handleFormSubmit"
      @cancel="closeForm"
    />

    <StateFeedback
      v-if="status !== 'success'"
      :state="status"
      :error="error"
      loading-text="Cargando carta completa..."
      empty-title="Carta vacía"
      empty-message="No hay platos ni bebidas registrados todavía."
      :action-label="isAuthenticated && !isOffline ? 'Agregar primer ítem' : ''"
      @retry="loadCarta"
      @action="openCreateForm"
    />

    <MenuList
      v-else
      :items="menuItems"
      view-mode="table"
      :is-offline="isOffline"
      :show-admin-actions="true"
      :can-mutate="isAuthenticated"
      @view-detail="router.push(`/menu/${$event}`)"
      @edit="openEditForm"
      @delete="askDelete"
    />

    <ConfirmDialog
      :open="Boolean(deleteTarget)"
      title="Retirar ítem de la carta"
      :message="`¿Seguro que deseas retirar '${deleteTarget?.nombre}' (${deleteTarget?.codigo}) de la carta?`"
      confirm-label="Retirar definitivamente"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
