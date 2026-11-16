import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

function loadServiceWorkerHarness({ fetchImpl }) {
  const listeners = new Map();
  const stores = new Map();

  const cachesMock = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async put(req, res) {
          const key = typeof req === 'string' ? req : req.url;
          store.set(key, res);
        },
        async match(req) {
          const key = typeof req === 'string' ? req : req.url;
          return store.get(key) || undefined;
        },
        async add(req) {
          const key = typeof req === 'string' ? req : req.url;
          store.set(key, new Response('cached', { status: 200 }));
        }
      };
    },
    async keys() {
      return Array.from(stores.keys());
    },
    async delete(key) {
      return stores.delete(key);
    }
  };

  const selfMock = {
    location: { origin: 'http://localhost:4173' },
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    skipWaiting() {},
    clients: { claim: async () => {} }
  };

  const swCode = fs.readFileSync(path.resolve(process.cwd(), 'public', 'sw.js'), 'utf8');
  const context = {
    self: selfMock,
    caches: cachesMock,
    fetch: fetchImpl,
    Response,
    Request,
    Headers,
    URL,
    Promise,
    Set,
    Array,
    JSON,
    Date
  };
  vm.createContext(context);
  vm.runInContext(swCode, context);

  async function dispatchFetch(url, { method = 'GET', mode = 'cors' } = {}) {
    let respondedPromise = null;
    const req = new Request(url, { method });
    Object.defineProperty(req, 'mode', { value: mode });

    const event = {
      request: req,
      respondWith(p) {
        respondedPromise = p;
      }
    };
    listeners.get('fetch')(event);
    return respondedPromise ? await respondedPromise : null;
  }

  return { dispatchFetch, stores };
}

describe('Service Worker AromaPOS - experiencia offline limitada y segura', () => {
  it('nunca cachea /api/auth/* y bloquea offline con HTTP 503 seguro', async () => {
    const { dispatchFetch, stores } = loadServiceWorkerHarness({
      fetchImpl: async () => {
        throw new TypeError('Offline');
      }
    });

    const res = await dispatchFetch('http://localhost:4173/api/auth/me');
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.codigo).toBe('OFFLINE_AUTH_UNAVAILABLE');
    expect(stores.get('aromapos-api-read-v1')).toBeUndefined();
  });

  it('bloquea pedidos y mutaciones offline con 503 OFFLINE_MUTATION_BLOCKED', async () => {
    const { dispatchFetch } = loadServiceWorkerHarness({
      fetchImpl: async () => {
        throw new TypeError('Offline');
      }
    });

    const resPost = await dispatchFetch('http://localhost:4173/api/pedidos', { method: 'POST' });
    expect(resPost.status).toBe(503);
    const json = await resPost.json();
    expect(json.error.codigo).toBe('OFFLINE_MUTATION_BLOCKED');
  });

  it('cachea GET /api/menu online y entrega carta de solo lectura offline con cabecera', async () => {
    let online = true;
    const { dispatchFetch } = loadServiceWorkerHarness({
      fetchImpl: async () => {
        if (!online) throw new TypeError('Offline');
        return new Response(JSON.stringify({ ok: true, data: [{ id: 1, codigo: 'CAF-LAT-01' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    });

    const liveRes = await dispatchFetch('http://localhost:4173/api/menu');
    expect(liveRes.status).toBe(200);
    expect(liveRes.headers.get('X-AromaPOS-Offline-Cache')).toBeNull();

    online = false;
    const offlineRes = await dispatchFetch('http://localhost:4173/api/menu');
    expect(offlineRes.status).toBe(200);
    expect(offlineRes.headers.get('X-AromaPOS-Offline-Cache')).toBe('HIT');
    const body = await offlineRes.json();
    expect(body.data[0].codigo).toBe('CAF-LAT-01');
  });

  it('no cachea exportación CSV ni consultas de /api/pedidos', async () => {
    const { dispatchFetch, stores } = loadServiceWorkerHarness({
      fetchImpl: async () => new Response('ok', { status: 200 })
    });

    await dispatchFetch('http://localhost:4173/api/menu/exportar/csv');
    await dispatchFetch('http://localhost:4173/api/pedidos');
    expect(stores.get('aromapos-api-read-v1')).toBeUndefined();
  });
});
