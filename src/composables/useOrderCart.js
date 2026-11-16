import { computed, readonly, ref } from 'vue';
import { calcularTotalesPedido } from '../services/pedidosService.js';

const ORDER_STORAGE_KEY = 'aromapos.pedido.borrador.v1';

function loadInitialOrder() {
  try {
    const raw = globalThis.localStorage?.getItem(ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const items = ref(loadInitialOrder());

function persistOrder() {
  try {
    globalThis.localStorage?.setItem(ORDER_STORAGE_KEY, JSON.stringify(items.value));
  } catch {
    // Ignora errores de cuota de almacenamiento
  }
}

export function useOrderCart() {
  const totales = computed(() => calcularTotalesPedido(items.value));
  const isEmpty = computed(() => items.value.length === 0);

  const quantitiesMap = computed(() => {
    const map = {};
    for (const item of items.value) {
      map[item.producto.id] = item.cantidad;
    }
    return map;
  });

  function addItem(producto, delta = 1) {
    if (!producto || producto.porciones <= 0) {
      return { ok: false, reason: 'Sin porciones disponibles en este turno.' };
    }

    const index = items.value.findIndex((i) => i.producto.id === producto.id);
    if (index === -1) {
      const cantidad = Math.min(producto.porciones, Math.max(1, delta));
      items.value = [...items.value, { producto, cantidad }];
      persistOrder();
      return { ok: true, cantidad };
    }

    const current = items.value[index];
    const nextQty = current.cantidad + delta;
    if (nextQty > producto.porciones) {
      return { ok: false, reason: `Solo quedan ${producto.porciones} porciones disponibles.` };
    }

    items.value = items.value.map((item, idx) =>
      idx === index ? { producto, cantidad: nextQty } : item
    );
    persistOrder();
    return { ok: true, cantidad: nextQty };
  }

  function updateQuantity(menuId, cantidad) {
    const target = items.value.find((i) => i.producto.id === menuId);
    if (!target) return;

    const parsed = Math.floor(Number(cantidad) || 0);
    if (parsed <= 0) {
      removeItem(menuId);
      return;
    }

    const clamped = Math.min(parsed, Math.max(1, target.producto.porciones));
    items.value = items.value.map((item) =>
      item.producto.id === menuId ? { ...item, cantidad: clamped } : item
    );
    persistOrder();
  }

  function removeItem(menuId) {
    items.value = items.value.filter((item) => item.producto.id !== menuId);
    persistOrder();
  }

  function clearOrder() {
    items.value = [];
    persistOrder();
  }

  function syncMenuSnapshot(menuActualizado) {
    if (!Array.isArray(menuActualizado) || items.value.length === 0) return;
    const byId = new Map(menuActualizado.map((p) => [p.id, p]));
    items.value = items.value
      .map((item) => {
        const fresh = byId.get(item.producto.id);
        if (!fresh) return item;
        if (fresh.porciones <= 0) return null;
        return {
          producto: fresh,
          cantidad: Math.min(item.cantidad, fresh.porciones)
        };
      })
      .filter(Boolean);
    persistOrder();
  }

  return {
    items: readonly(items),
    totales,
    isEmpty,
    quantitiesMap,
    addItem,
    updateQuantity,
    removeItem,
    clearOrder,
    syncMenuSnapshot
  };
}
