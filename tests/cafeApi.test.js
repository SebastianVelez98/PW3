import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { handleCafeRequest } from '../server/cafe-api.mjs';

const DATA_FILE = path.resolve(process.cwd(), 'server', 'data', 'cafeteria.json');

async function callApi(method, urlPath, { body, headers = {} } = {}) {
  const payload = body !== undefined ? JSON.stringify(body) : '';
  const req = Readable.from(payload ? [payload] : []);
  req.method = method;
  req.url = urlPath;
  req.headers = {
    host: 'localhost:3000',
    ...(payload ? { 'content-type': 'application/json' } : {}),
    ...headers
  };

  let statusCode = 200;
  let resHeaders = {};
  let rawBody = '';

  await new Promise((resolve, reject) => {
    const res = {
      writeHead(status, hdrs = {}) {
        statusCode = status;
        resHeaders = Object.fromEntries(
          Object.entries(hdrs).map(([k, v]) => [k.toLowerCase(), v])
        );
      },
      end(chunk = '') {
        rawBody += String(chunk);
        resolve();
      }
    };
    handleCafeRequest(req, res).catch(reject);
  });

  const isJson = (resHeaders['content-type'] || '').includes('application/json');
  return {
    status: statusCode,
    headers: resHeaders,
    body: isJson && rawBody ? JSON.parse(rawBody) : rawBody
  };
}

describe('AromaPOS API - verificación integral de endpoints de cafetería', () => {
  let cookieHeader = '';
  let createdMenuId = null;
  let createdOrderId = null;

  beforeAll(() => {
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
  });

  afterAll(() => {
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
  });

  it('consulta /api/auth/me sin sesión sin emitir 401 y rechaza mutaciones sin sesión (401)', async () => {
    const meAnonRes = await callApi('GET', '/api/auth/me');
    expect(meAnonRes.status).toBe(200);
    expect(meAnonRes.body.data).toBeNull();
    expect(meAnonRes.body.meta.activo).toBe(false);

    const res = await callApi('POST', '/api/menu', {
      body: { codigo: 'NO-AUTH', nombre: 'Espresso', categoria: 'Café', precio: 2.5, porciones: 5 }
    });
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('NO_AUTORIZADO');
  });

  it('autentica barista, ejecuta CRUD de carta y procesa pedidos descontando porciones', async () => {
    const loginRes = await callApi('POST', '/api/auth/login', {
      body: { username: 'barista', password: 'cafe123' }
    });
    expect(loginRes.status).toBe(200);
    cookieHeader = loginRes.headers['set-cookie'].split(';')[0];

    const meRes = await callApi('GET', '/api/auth/me', { headers: { cookie: cookieHeader } });
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.username).toBe('barista');

    // Validación 400
    const badRes = await callApi('POST', '/api/menu', {
      headers: { cookie: cookieHeader },
      body: { codigo: '', nombre: '', precio: -1, porciones: 1.5, tiempoPreparacion: 0 }
    });
    expect(badRes.status).toBe(400);

    // Crear plato/bebida 201
    const codigo = `CAFE-${Date.now()}`;
    const createRes = await callApi('POST', '/api/menu', {
      headers: { cookie: cookieHeader },
      body: {
        codigo,
        nombre: 'Flat White Doble',
        descripcion: 'Doble ristretto y microespuma sedosa',
        categoria: 'Café de Especialidad',
        precio: 4.0,
        porciones: 5,
        tiempoPreparacion: 3
      }
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.calculos.impuesto).toBe(0.6);
    expect(createRes.body.data.calculos.estadoStock).toBe('BAJO');
    createdMenuId = createRes.body.data.id;

    // Código duplicado 409
    const dupRes = await callApi('POST', '/api/menu', {
      headers: { cookie: cookieHeader },
      body: { codigo, nombre: 'Duplicado', categoria: 'Café', precio: 4, porciones: 3, tiempoPreparacion: 2 }
    });
    expect(dupRes.status).toBe(409);

    // Confirmar pedido descontando 2 porciones -> quedan 3
    const orderRes = await callApi('POST', '/api/pedidos', {
      headers: { cookie: cookieHeader },
      body: {
        clienteNombre: 'Lucía Torres',
        tipoServicio: 'En mesa',
        numeroMesa: 'Mesa 2',
        metodoPago: 'Tarjeta',
        notas: 'Sin azúcar',
        items: [{ menuId: createdMenuId, cantidad: 2 }]
      }
    });
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.ticket).toMatch(/^PED-/);
    expect(orderRes.body.data.total).toBe(9.2);
    createdOrderId = orderRes.body.data.id;

    // Verificar descuento de porciones
    const detailAfterOrder = await callApi('GET', `/api/menu/${createdMenuId}`);
    expect(detailAfterOrder.status).toBe(200);
    expect(detailAfterOrder.body.data.porciones).toBe(3);

    // Avanzar estado del ticket en cocina
    const patchRes = await callApi('PATCH', `/api/pedidos/${createdOrderId}/estado`, {
      headers: { cookie: cookieHeader },
      body: { estado: 'LISTO' }
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.estado).toBe('LISTO');

    // Exportar CSV
    const csvRes = await callApi('GET', '/api/menu/exportar/csv');
    expect(csvRes.status).toBe(200);
    expect(csvRes.body).toContain('ID,Codigo,Nombre,Descripcion,Categoria,Precio,Porciones,TiempoMin');

    // Eliminar ítem 200 y verificar 404
    const delRes = await callApi('DELETE', `/api/menu/${createdMenuId}`, {
      headers: { cookie: cookieHeader }
    });
    expect(delRes.status).toBe(200);

    const notFoundRes = await callApi('GET', `/api/menu/${createdMenuId}`);
    expect(notFoundRes.status).toBe(404);
  });
});
