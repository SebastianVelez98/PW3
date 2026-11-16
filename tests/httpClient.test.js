import { describe, expect, it } from 'vitest';
import { ApiError, createLatestRequestGuard, httpRequest } from '../src/services/httpClient.js';

function mockJsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders
    }
  });
}

describe('httpClient - validación de response.ok y manejo de errores', () => {
  it('retorna data y meta cuando response.ok es true', async () => {
    const fetchMock = async () =>
      mockJsonResponse(200, {
        ok: true,
        data: [{ id: 1, codigo: 'CAF-LAT-01' }],
        meta: { metricas: { totalProductos: 1 } }
      });

    const res = await httpRequest('/menu', { fetchImpl: fetchMock, baseUrl: '/api' });
    expect(res.data).toHaveLength(1);
    expect(res.meta.metricas.totalProductos).toBe(1);
    expect(res.fromOfflineCache).toBe(false);
  });

  it('detecta encabezado de caché offline del Service Worker de AromaPOS', async () => {
    const fetchMock = async () =>
      mockJsonResponse(
        200,
        { ok: true, data: [], meta: {} },
        { 'X-AromaPOS-Offline-Cache': 'HIT', 'X-AromaPOS-Cached-At': '2026-11-15T10:00:00.000Z' }
      );

    const res = await httpRequest('/menu', { fetchImpl: fetchMock, baseUrl: '/api' });
    expect(res.fromOfflineCache).toBe(true);
    expect(res.cachedAt).toBe('2026-11-15T10:00:00.000Z');
  });

  it('lanza ApiError tipado cuando response.ok es false (400 / 401 / 409)', async () => {
    const fetch409 = async () =>
      mockJsonResponse(409, {
        ok: false,
        error: {
          codigo: 'CODIGO_DUPLICADO',
          mensaje: 'El código ya existe en la carta',
          detalles: [{ campo: 'codigo', valor: 'CAF-LAT-01' }]
        },
        timestamp: '2026-11-15T12:00:00.000Z'
      });

    await expect(httpRequest('/menu', { method: 'POST', body: {}, fetchImpl: fetch409 })).rejects.toSatisfy(
      (err) =>
        err instanceof ApiError &&
        err.status === 409 &&
        err.codigo === 'CODIGO_DUPLICADO' &&
        err.mensaje === 'El código ya existe en la carta' &&
        err.detalles[0]?.campo === 'codigo'
    );
  });

  it('normaliza fallos de red en ApiError con isNetworkError = true', async () => {
    const fetchOffline = async () => {
      throw new TypeError('Failed to fetch');
    };

    await expect(httpRequest('/menu', { fetchImpl: fetchOffline })).rejects.toSatisfy(
      (err) => err instanceof ApiError && err.codigo === 'NETWORK_ERROR' && err.isNetworkError === true
    );
  });
});

describe('createLatestRequestGuard - prevención de condiciones de carrera', () => {
  it('aborta la petición anterior y descarta respuestas fuera de orden', async () => {
    const guard = createLatestRequestGuard();
    const abortedFlags = [];

    const p1 = guard.run(
      (signal) =>
        new Promise((resolve) => {
          signal.addEventListener('abort', () => abortedFlags.push('first-aborted'));
          setTimeout(() => resolve('respuesta-lenta-obsoleta'), 40);
        })
    );

    const p2 = guard.run(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('respuesta-reciente'), 10);
        })
    );

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(abortedFlags).toContain('first-aborted');
    expect(res1.stale).toBe(true);
    expect(res2.stale).toBe(false);
    expect(res2.value).toBe('respuesta-reciente');
  });
});
