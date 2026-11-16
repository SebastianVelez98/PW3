import { describe, expect, it } from 'vitest';
import {
  mapServerValidationErrors,
  validateLoginForm,
  validateMenuForm,
  validatePedidoForm
} from '../src/utils/validators.js';
import { calcularTotalesPedido } from '../src/services/pedidosService.js';

describe('Validadores y cálculos de AromaPOS', () => {
  it('normaliza código y valida ítems del menú', () => {
    const res = validateMenuForm({
      codigo: '  caf cap 07 ',
      nombre: '  Cappuccino Doble ',
      descripcion: 'Espresso con espuma cremosa',
      categoria: 'Café de Especialidad',
      precio: '4.5',
      porciones: '12',
      tiempoPreparacion: '4'
    });

    expect(res.valid).toBe(true);
    expect(res.sanitized.codigo).toBe('CAF-CAP-07');
    expect(res.sanitized.nombre).toBe('Cappuccino Doble');
    expect(res.sanitized.precio).toBe(4.5);
    expect(res.sanitized.porciones).toBe(12);
    expect(res.sanitized.tiempoPreparacion).toBe(4);
  });

  it('rechaza precios inválidos y porciones decimales', () => {
    const res = validateMenuForm({
      codigo: '',
      nombre: '',
      categoria: '',
      precio: 0,
      porciones: 2.5,
      tiempoPreparacion: 0
    });

    expect(res.valid).toBe(false);
    expect(res.errors.codigo).toBeTruthy();
    expect(res.errors.nombre).toBeTruthy();
    expect(res.errors.precio).toBeTruthy();
    expect(res.errors.porciones).toBeTruthy();
    expect(res.errors.tiempoPreparacion).toBeTruthy();
  });

  it('mapea errores de campo devueltos por la API (409 CODIGO_DUPLICADO)', () => {
    const mapped = mapServerValidationErrors({
      codigo: 'CODIGO_DUPLICADO',
      mensaje: 'El código ya existe',
      detalles: [{ campo: 'codigo', valor: 'CAF-LAT-01' }]
    });
    expect(mapped.codigo).toBe('El código ya existe');
  });

  it('valida login y formulario de pedido en mesa o para llevar', () => {
    expect(validateLoginForm({ username: '', password: '' }).valid).toBe(false);
    expect(validateLoginForm({ username: 'barista', password: 'cafe123' }).valid).toBe(true);
    expect(
      validatePedidoForm({
        clienteNombre: 'Ana',
        tipoServicio: 'En mesa',
        numeroMesa: '',
        metodoPago: 'Efectivo'
      }).valid
    ).toBe(false);
    expect(
      validatePedidoForm({
        clienteNombre: 'Ana Pérez',
        tipoServicio: 'Para llevar',
        numeroMesa: '',
        metodoPago: 'Tarjeta'
      }).valid
    ).toBe(true);
  });

  it('calcula subtotal, IVA 15%, total y tiempo máximo de preparación', () => {
    const totales = calcularTotalesPedido([
      { producto: { id: 1, precio: 4.0, tiempoPreparacion: 4, calculos: { impuesto: 0.6 } }, cantidad: 2 },
      { producto: { id: 2, precio: 8.0, tiempoPreparacion: 9, calculos: { impuesto: 1.2 } }, cantidad: 1 }
    ]);

    expect(totales.totalUnidades).toBe(3);
    expect(totales.subtotal).toBe(16);
    expect(totales.impuesto).toBe(2.4);
    expect(totales.total).toBe(18.4);
    expect(totales.tiempoEstimadoMin).toBe(9);
  });
});
