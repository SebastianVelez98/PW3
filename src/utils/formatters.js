/**
 * Utilidades de formateo para AromaPOS (moneda, fechas, códigos y estados).
 */

export function formatCurrency(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function normalizarCodigoInput(codigo) {
  return String(codigo ?? '').trim().toUpperCase().replace(/\s+/g, '-');
}

export function getStockBadgeMeta(estadoStock) {
  switch (estadoStock) {
    case 'AGOTADO':
      return {
        label: 'Agotado',
        classes: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500'
      };
    case 'CRITICO':
      return {
        label: 'Últimas porciones',
        classes: 'bg-orange-50 text-orange-700 border-orange-200',
        dotClass: 'bg-orange-500'
      };
    case 'BAJO':
      return {
        label: 'Pocas porciones',
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
        dotClass: 'bg-amber-500'
      };
    default:
      return {
        label: 'Disponible',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500'
      };
  }
}

export function getEstadoPedidoMeta(estado) {
  switch (estado) {
    case 'LISTO':
      return {
        label: 'Listo para entregar',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        nextEstado: 'ENTREGADO',
        nextLabel: 'Marcar entregado'
      };
    case 'ENTREGADO':
      return {
        label: 'Entregado',
        classes: 'bg-stone-100 text-stone-700 border-stone-200',
        nextEstado: null,
        nextLabel: ''
      };
    default:
      return {
        label: 'En preparación',
        classes: 'bg-amber-50 text-amber-800 border-amber-200',
        nextEstado: 'LISTO',
        nextLabel: 'Marcar listo'
      };
  }
}
