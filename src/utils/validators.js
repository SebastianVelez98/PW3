/**
 * Validadores de formularios en cliente alineados con AromaPOS API.
 */

import { normalizarCodigoInput } from './formatters.js';

export function validateLoginForm(values) {
  const errors = {};
  if (!String(values?.username ?? '').trim()) {
    errors.username = 'El usuario es obligatorio.';
  }
  if (!String(values?.password ?? '')) {
    errors.password = 'La contraseña es obligatoria.';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateMenuForm(values) {
  const errors = {};

  const codigo = normalizarCodigoInput(values?.codigo);
  if (!codigo) {
    errors.codigo = 'El código de carta es obligatorio.';
  } else if (codigo.length > 40) {
    errors.codigo = 'El código no puede exceder 40 caracteres.';
  }

  const nombre = String(values?.nombre ?? '').trim();
  if (!nombre) {
    errors.nombre = 'El nombre del plato o bebida es obligatorio.';
  } else if (nombre.length > 120) {
    errors.nombre = 'El nombre no puede exceder 120 caracteres.';
  }

  const descripcion = String(values?.descripcion ?? '').trim();
  if (descripcion.length > 400) {
    errors.descripcion = 'La descripción no puede superar los 400 caracteres.';
  }

  const categoria = String(values?.categoria ?? '').trim();
  if (!categoria) {
    errors.categoria = 'La categoría es obligatoria.';
  }

  const precio = Number(values?.precio);
  if (values?.precio === '' || values?.precio === null || values?.precio === undefined || Number.isNaN(precio)) {
    errors.precio = 'Ingresa un precio numérico válido.';
  } else if (precio <= 0) {
    errors.precio = 'El precio debe ser mayor a $0.00.';
  } else if (precio > 5000) {
    errors.precio = 'El precio no puede exceder $5,000.';
  }

  const porciones = Number(values?.porciones);
  if (values?.porciones === '' || values?.porciones === null || values?.porciones === undefined || Number.isNaN(porciones)) {
    errors.porciones = 'Ingresa la cantidad de porciones.';
  } else if (!Number.isInteger(porciones) || porciones < 0 || porciones > 10000) {
    errors.porciones = 'Las porciones deben ser un entero entre 0 y 10,000.';
  }

  const tiempoPreparacion = Number(values?.tiempoPreparacion);
  if (
    values?.tiempoPreparacion === '' ||
    values?.tiempoPreparacion === null ||
    values?.tiempoPreparacion === undefined ||
    Number.isNaN(tiempoPreparacion)
  ) {
    errors.tiempoPreparacion = 'Indica el tiempo de preparación en minutos.';
  } else if (!Number.isInteger(tiempoPreparacion) || tiempoPreparacion < 1 || tiempoPreparacion > 120) {
    errors.tiempoPreparacion = 'El tiempo debe estar entre 1 y 120 minutos.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      codigo,
      nombre,
      descripcion,
      categoria,
      precio: Number((precio || 0).toFixed(2)),
      porciones: Number.isInteger(porciones) ? porciones : 0,
      tiempoPreparacion: Number.isInteger(tiempoPreparacion) ? tiempoPreparacion : 4
    }
  };
}

export function validatePedidoForm(values) {
  const errors = {};
  const clienteNombre = String(values?.clienteNombre ?? '').trim();
  if (!clienteNombre || clienteNombre.length < 2) {
    errors.clienteNombre = 'Ingresa el nombre del comensal o cliente.';
  } else if (clienteNombre.length > 100) {
    errors.clienteNombre = 'El nombre no puede superar 100 caracteres.';
  }

  const tipoServicio = String(values?.tipoServicio ?? '');
  if (!['En mesa', 'Para llevar', 'Domicilio'].includes(tipoServicio)) {
    errors.tipoServicio = 'Selecciona un tipo de servicio válido.';
  }

  const numeroMesa = String(values?.numeroMesa ?? '').trim();
  if (tipoServicio === 'En mesa' && !numeroMesa) {
    errors.numeroMesa = 'Indica el número de mesa.';
  }

  const metodoPago = String(values?.metodoPago ?? '');
  if (!['Efectivo', 'Tarjeta', 'Transferencia'].includes(metodoPago)) {
    errors.metodoPago = 'Selecciona un método de pago válido.';
  }

  const notas = String(values?.notas ?? '').trim();
  if (notas.length > 200) {
    errors.notas = 'Las notas para cocina no pueden superar 200 caracteres.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function mapServerValidationErrors(apiError) {
  const fieldErrors = {};
  if (!apiError || !Array.isArray(apiError.detalles)) return fieldErrors;
  for (const item of apiError.detalles) {
    if (item?.campo && item?.mensaje) {
      fieldErrors[item.campo] = item.mensaje;
    } else if (item?.campo && apiError.codigo === 'CODIGO_DUPLICADO') {
      fieldErrors[item.campo] = apiError.mensaje;
    }
  }
  return fieldErrors;
}
