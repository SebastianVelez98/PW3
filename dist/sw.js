/* eslint-disable no-restricted-globals */
/**
 * Service Worker de AromaPOS (PWA Cafetería & Pedidos)
 * Estrategia Offline Limitada y Segura:
 *  - App Shell (HTML, JS, CSS, iconos, manifest): Cache-First para assets / Network-First para navegación SPA.
 *  - Lecturas seguras del menú (GET /api/menu* excepto CSV): Network-First con respaldo en caché de solo lectura.
 *  - Autenticación (/api/auth/*), Pedidos (/api/pedidos*) y Exportación CSV: Network-Only (no se cachean).
 *  - Mutaciones (POST, PUT, PATCH, DELETE): Network-Only; bloqueadas offline con HTTP 503 seguro.
 */

const SHELL_CACHE = 'aromapos-shell-v1';
const API_READ_CACHE = 'aromapos-api-read-v1';
const ALLOWED_CACHES = [SHELL_CACHE, API_READ_CACHE];

const STATIC_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png'
];

// En tiempo de build, Vite reemplaza este arreglo con los assets con hash generados.
const BUILD_ASSETS = /* __BUILD_ASSETS_START__ */ ["/assets/index-sVtTWXTQ.css","/assets/index-C9X1lvPW.js","/assets/MenuItemDetailView-CmlG6_cK.js","/assets/CartaAdminView-CzQFhhSB.js","/assets/PedidosPosView-ChH1pPaZ.js","/assets/LoginView-D_Vlk1L2.js","/assets/validators-C-PDmSXY.js","/assets/NotFoundView-BNg3Inho.js"] /* __BUILD_ASSETS_END__ */;

const PRECACHE_URLS = Array.from(new Set([...STATIC_SHELL_URLS, ...BUILD_ASSETS]));

function jsonErrorResponse(status, codigo, mensaje) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        codigo,
        mensaje,
        detalles: []
      },
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-AromaPOS-Offline-Blocked': 'true'
      }
    }
  );
}

function isDevAsset(pathname) {
  return (
    pathname.startsWith('/@') ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/')
  );
}

function isCacheableMenuGet(method, pathname) {
  if (method !== 'GET') return false;
  if (!pathname.startsWith('/api/menu')) return false;
  if (pathname.startsWith('/api/menu/exportar/')) return false;
  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(async (cache) => {
        await Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ALLOWED_CACHES.includes(key))
            .map((obsoleteKey) => caches.delete(obsoleteKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function handleApiGetMenu(request) {
  const cache = await caches.open(API_READ_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const headers = new Headers(networkResponse.headers);
      headers.set('X-AromaPOS-Cached-At', new Date().toISOString());
      const bodyBuffer = await networkResponse.clone().arrayBuffer();
      const cacheable = new Response(bodyBuffer, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers
      });
      await cache.put(request, cacheable);
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('X-AromaPOS-Offline-Cache', 'HIT');
      const bodyBuffer = await cached.arrayBuffer();
      return new Response(bodyBuffer, {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }

    return jsonErrorResponse(
      503,
      'OFFLINE_CACHE_MISS',
      'Sin conexión con la API de cafetería y sin copia previa en caché para este filtro.'
    );
  }
}

async function handleNavigationRequest(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      await cache.put('/index.html', networkResponse.clone());
      await cache.put('/', networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedIndex = (await cache.match('/index.html')) || (await cache.match('/'));
    if (cachedIndex) {
      return cachedIndex;
    }
    return new Response(
      '<!doctype html><html lang="es"><body><h1>Sin conexión</h1><p>No fue posible cargar la carta offline.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function handleShellAsset(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('Recurso estático no disponible sin conexión.', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (isDevAsset(url.pathname)) {
    return;
  }

  // 1. Seguridad: rutas de autenticación nunca se cachean
  if (url.pathname.startsWith('/api/auth/')) {
    event.respondWith(
      fetch(request).catch(() =>
        jsonErrorResponse(
          503,
          'OFFLINE_AUTH_UNAVAILABLE',
          'La autenticación de personal requiere conexión activa con el servidor.'
        )
      )
    );
    return;
  }

  // 2. Seguridad: mutaciones (POST/PUT/PATCH/DELETE), pedidos activos y CSV nunca se cachean offline
  if (url.pathname.startsWith('/api/') && !isCacheableMenuGet(request.method, url.pathname)) {
    event.respondWith(
      fetch(request).catch(() =>
        jsonErrorResponse(
          503,
          'OFFLINE_MUTATION_BLOCKED',
          'Operación bloqueada sin conexión: los pedidos y cambios de carta requieren red para proteger las porciones disponibles.'
        )
      )
    );
    return;
  }

  // 3. Lectura segura de la carta: Network-First con respaldo offline en caché
  if (isCacheableMenuGet(request.method, url.pathname)) {
    event.respondWith(handleApiGetMenu(request));
    return;
  }

  // 4. Navegación SPA (history fallback offline hacia /index.html)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // 5. Assets estáticos del App Shell
  if (request.method === 'GET') {
    event.respondWith(handleShellAsset(request));
  }
});
