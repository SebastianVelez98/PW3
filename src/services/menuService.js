/**
 * Servicio del Menú de Cafetería conectado a /api/menu/*.
 */

import { httpRequest, resolveApiBaseUrl } from './httpClient.js';

export const menuService = {
  async listar(filtros = {}, { signal } = {}) {
    const res = await httpRequest('/menu', {
      method: 'GET',
      query: {
        busqueda: filtros.busqueda,
        categoria: filtros.categoria
      },
      signal
    });

    return {
      items: Array.isArray(res.data) ? res.data : [],
      metricas: res.meta?.metricas ?? {
        totalProductos: 0,
        totalPorciones: 0,
        valorTotalMenu: 0,
        platosConStockBajo: 0
      },
      fromOfflineCache: res.fromOfflineCache,
      cachedAt: res.cachedAt
    };
  },

  async obtenerPorId(id, { signal } = {}) {
    const res = await httpRequest(`/menu/${encodeURIComponent(id)}`, {
      method: 'GET',
      signal
    });
    return {
      item: res.data,
      fromOfflineCache: res.fromOfflineCache,
      cachedAt: res.cachedAt
    };
  },

  async crear(payload) {
    const res = await httpRequest('/menu', {
      method: 'POST',
      body: payload
    });
    return res.data;
  },

  async actualizar(id, payload) {
    const res = await httpRequest(`/menu/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload
    });
    return res.data;
  },

  async eliminar(id) {
    const res = await httpRequest(`/menu/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return {
      item: res.data,
      mensaje: res.meta?.mensaje || 'Ítem retirado de la carta correctamente.'
    };
  },

  getExportCsvUrl() {
    return `${resolveApiBaseUrl()}/menu/exportar/csv`;
  }
};
