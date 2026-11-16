# AromaPOS · Cafetería, Menú y Pedidos (SPA/PWA en Vue 3)

Aplicación de una sola página (**SPA**) e instalable (**PWA**) construida con **Vue 3**, **Vite**, **Vue Router 4** y **Tailwind CSS v4**, junto con su **API REST equivalente** para gestión de carta de cafetería, toma de pedidos en caja POS y tablero de cocina.

---

## Características implementadas

- **Consumo completo de API REST (`server/cafe-api.mjs`):**
  - Autenticación de turno con cookies `httpOnly` (`POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`).
  - Menú del día con búsqueda en vivo y filtro por categoría (`GET /api/menu?busqueda=...&categoria=...`) + métricas (`meta.metricas`).
  - Vista de detalle dinámico por ítem (`GET /api/menu/:id`).
  - CRUD completo de carta (`POST /api/menu`, `PUT /api/menu/:id`, `DELETE /api/menu/:id`) y exportación CSV (`GET /api/menu/exportar/csv`).
  - Toma de pedidos POS y tablero de barra/cocina (`GET /api/pedidos`, `POST /api/pedidos` con descuento atómico de porciones y `PATCH /api/pedidos/:id/estado`).
- **Cliente HTTP centralizado (`src/services/httpClient.js`):**
  - Validación explícita de `response.ok` y `payload.ok`, normalización en `ApiError` (`400`, `401`, `404`, `409`, red y timeout).
  - Prevención de condiciones de carrera mediante `createLatestRequestGuard()` (`AbortController` + secuencia monotónica `latestSeq`) y control de época de sesión en `useAuth.js`.
- **PWA instalable y modo offline limitado y seguro:**
  - `public/manifest.webmanifest` con iconos PNG (`192x192`, `512x512`, `maskable`) + SVG generados por `scripts/generate-icons.mjs`.
  - `public/sw.js` con caché de *App Shell* (`aromapos-shell-v1`), *Network-First* solo para lecturas `GET /api/menu*` (sin CSV) en `aromapos-api-read-v1`, exclusión total de `/api/auth/*` y `/api/pedidos*`, y bloqueo seguro (`503`) de mutaciones offline.

---

## Requisitos e instalación

- **Node.js** 18+ (probado en Node.js v23) y **npm** 9+.

```bash
npm install
```

*(Opcional)* Copia las variables de entorno si deseas cambiar el puerto o URL de la API:

```bash
cp .env.example .env
```

---

## Ejecución y demostración funcional

Necesitarás **dos terminales** abiertas en la carpeta del proyecto:

**Terminal 1 — Iniciar la API REST de AromaPOS (puerto `3000`):**
```powershell
npm run api
```

**Terminal 2 — Compilar y servir la PWA (puerto `4173`):**
```powershell
npm run build
npm run preview
```
*(O `npm run dev` para modo desarrollo con recarga rápida en `http://localhost:5173`).*

### Datos para la demostración
- Abre **`http://localhost:4173`** en Chrome o Edge.
- Credenciales de barista/encargada: usuario **`barista`** / contraseña **`cafe123`** (o botón **Autocompletar** en `/login`).
- En DevTools → **Application** puedes verificar el `Manifest`, el `Service Worker` (`sw.js`), probar la instalación desde el botón **Instalar** y activar **Offline** para comprobar la consulta segura de la carta y el bloqueo de pedidos/mutaciones.

---

## Pruebas automatizadas

```bash
npm test
```

Incluye pruebas unitarias y de contrato para:
- `tests/httpClient.test.js`: validación de `response.ok`, `ApiError` y prevención de condiciones de carrera con `AbortController`.
- `tests/validators.test.js`: validadores de carta, pedidos, login y cálculo de totales/IVA 15%.
- `tests/swSafety.test.js`: reglas de caché segura del Service Worker.
- `tests/cafeApi.test.js`: verificación integral del contrato HTTP de `server/cafe-api.mjs`.

---

## Entregable técnico

- El informe técnico de máximo dos páginas se encuentra en [INFORME_TECNICO.md](./INFORME_TECNICO.md).
