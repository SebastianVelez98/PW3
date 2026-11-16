/**
 * Servicio de Pedidos y Tickets de Barra/Cocina conectado a /api/pedidos/*.
 */

import { httpRequest } from './httpClient.js';

export function calcularTotalesPedido(items) {
  const resumen = items.reduce(
    (acc, item) => {
      const cantidad = Math.max(0, Math.floor(Number(item.cantidad) || 0));
      const precioUnitario = Number(item.producto?.precio) || 0;
      const impuestoUnitario =
        item.producto?.calculos?.impuesto !== undefined
          ? Number(item.producto.calculos.impuesto)
          : Number((precioUnitario * 0.15).toFixed(2));
      const tiempoPrep = Number(item.producto?.tiempoPreparacion) || 3;

      return {
        totalUnidades: acc.totalUnidades + cantidad,
        subtotal: acc.subtotal + precioUnitario * cantidad,
        impuesto: acc.impuesto + impuestoUnitario * cantidad,
        tiempoEstimadoMin: Math.max(acc.tiempoEstimadoMin, tiempoPrep)
      };
    },
    { totalUnidades: 0, subtotal: 0, impuesto: 0, tiempoEstimadoMin: 0 }
  );

  const subtotal = Number(resumen.subtotal.toFixed(2));
  const impuesto = Number(resumen.impuesto.toFixed(2));
  const total = Number((subtotal + impuesto).toFixed(2));

  return {
    totalUnidades: resumen.totalUnidades,
    subtotal,
    impuesto,
    total,
    tiempoEstimadoMin: resumen.totalUnidades > 0 ? resumen.tiempoEstimadoMin : 0
  };
}

export const pedidosService = {
  async listar({ signal } = {}) {
    const res = await httpRequest('/pedidos', {
      method: 'GET',
      signal
    });
    return {
      pedidos: Array.isArray(res.data) ? res.data : [],
      resumen: res.meta?.resumen ?? {
        totalPedidos: 0,
        pendientesCocina: 0,
        listos: 0,
        entregados: 0,
        recaudacionTotal: 0
      }
    };
  },

  async crear({ items, clienteNombre, tipoServicio, numeroMesa, metodoPago, notas }) {
    const res = await httpRequest('/pedidos', {
      method: 'POST',
      body: {
        clienteNombre,
        tipoServicio,
        numeroMesa,
        metodoPago,
        notas,
        items: items.map((i) => ({
          menuId: i.producto.id,
          cantidad: i.cantidad
        }))
      }
    });

    return {
      pedido: res.data,
      mensaje: res.meta?.mensaje || 'Pedido enviado a barra/cocina.'
    };
  },

  async actualizarEstado(id, estado) {
    const res = await httpRequest(`/pedidos/${encodeURIComponent(id)}/estado`, {
      method: 'PATCH',
      body: { estado }
    });
    return res.data;
  }
};
