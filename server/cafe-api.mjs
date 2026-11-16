/**
 * Servidor API REST equivalente para AromaPOS (Cafetería, Menú y Pedidos).
 * Implementado con módulos nativos de Node.js y persistencia en JSON local.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'cafeteria.json');
const PORT = Number(process.env.PORT || 3000);

const sessions = new Map();

function seedMenu() {
  const ahora = new Date().toISOString();
  return [
    {
      id: 1,
      codigo: 'CAF-LAT-01',
      nombre: 'Latte Vainilla Artesanal',
      descripcion: 'Doble espresso arábica con leche texturizada y jarabe natural de vainilla.',
      categoria: 'Café de Especialidad',
      precio: 4.25,
      porciones: 18,
      tiempoPreparacion: 4,
      creado_en: ahora,
      actualizado_en: ahora
    },
    {
      id: 2,
      codigo: 'BEB-CLD-02',
      nombre: 'Cold Brew Naranja & Caramelo',
      descripcion: 'Extracción en frío de 16 horas con notas cítricas y hielo cristalino.',
      categoria: 'Bebidas Frías',
      precio: 4.75,
      porciones: 5,
      tiempoPreparacion: 3,
      creado_en: ahora,
      actualizado_en: ahora
    },
    {
      id: 3,
      codigo: 'PAN-CRO-03',
      nombre: 'Croissant de Almendras',
      descripcion: 'Hojaldre horneado con mantequilla francesa y láminas de almendra tostada.',
      categoria: 'Panadería',
      precio: 3.6,
      porciones: 4,
      tiempoPreparacion: 2,
      creado_en: ahora,
      actualizado_en: ahora
    },
    {
      id: 4,
      codigo: 'DES-AVO-04',
      nombre: 'Tostada Avocado & Huevo Pochado',
      descripcion: 'Pan de masa madre, aguacate machacado, huevo pochado y semillas de sésamo.',
      categoria: 'Desayunos',
      precio: 7.9,
      porciones: 12,
      tiempoPreparacion: 8,
      creado_en: ahora,
      actualizado_en: ahora
    },
    {
      id: 5,
      codigo: 'POS-VAS-05',
      nombre: 'Cheesecake Vasco de Frutos Rojos',
      descripcion: 'Porción cremosa horneada a alta temperatura con coulis artesanal de moras.',
      categoria: 'Postres',
      precio: 5.5,
      porciones: 2,
      tiempoPreparacion: 3,
      creado_en: ahora,
      actualizado_en: ahora
    },
    {
      id: 6,
      codigo: 'BEB-MAT-06',
      nombre: 'Matcha Latte Ceremonial',
      descripcion: 'Té verde matcha japonés batido con leche de avena orgánica.',
      categoria: 'Bebidas Frías',
      precio: 4.9,
      porciones: 14,
      tiempoPreparacion: 4,
      creado_en: ahora,
      actualizado_en: ahora
    }
  ];
}

function loadDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { nextMenuId: 7, nextPedidoNum: 1001, menu: seedMenu(), pedidos: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function clasificarEstadoStock(porciones) {
  const cantidad = Number(porciones) || 0;
  if (cantidad <= 0) return 'AGOTADO';
  if (cantidad <= 2) return 'CRITICO';
  if (cantidad <= 5) return 'BAJO';
  return 'OPTIMO';
}

function calcularImpuesto(precio, tasa = 0.15) {
  const monto = Number(precio) || 0;
  if (monto <= 0) return 0;
  return Number((monto * tasa).toFixed(2));
}

function enriquecerItemMenu(item) {
  const porciones = Number(item.porciones) || 0;
  const precio = Number(item.precio) || 0;
  const tiempoPreparacion = Number(item.tiempoPreparacion) || 1;
  const impuesto = calcularImpuesto(precio);
  const precioTotal = Number((precio + impuesto).toFixed(2));
  return {
    ...item,
    id: Number(item.id),
    precio,
    porciones,
    tiempoPreparacion,
    calculos: {
      impuesto,
      precioTotal,
      estadoStock: clasificarEstadoStock(porciones),
      requiereAlertaStock: porciones <= 5
    }
  };
}

function calcularMetricasMenu(items) {
  const acc = items.reduce(
    (a, p) => {
      const porciones = Number(p.porciones) || 0;
      const precio = Number(p.precio) || 0;
      return {
        totalProductos: a.totalProductos + 1,
        totalPorciones: a.totalPorciones + porciones,
        valorTotalMenu: a.valorTotalMenu + porciones * precio,
        platosConStockBajo: a.platosConStockBajo + (porciones <= 5 ? 1 : 0)
      };
    },
    { totalProductos: 0, totalPorciones: 0, valorTotalMenu: 0, platosConStockBajo: 0 }
  );
  return {
    ...acc,
    valorTotalMenu: Number(acc.valorTotalMenu.toFixed(2))
  };
}

function calcularResumenPedidos(pedidos) {
  const acc = pedidos.reduce(
    (a, p) => ({
      totalPedidos: a.totalPedidos + 1,
      pendientesCocina: a.pendientesCocina + (p.estado === 'EN_PREPARACION' ? 1 : 0),
      listos: a.listos + (p.estado === 'LISTO' ? 1 : 0),
      entregados: a.entregados + (p.estado === 'ENTREGADO' ? 1 : 0),
      recaudacionTotal: a.recaudacionTotal + (Number(p.total) || 0)
    }),
    { totalPedidos: 0, pendientesCocina: 0, listos: 0, entregados: 0, recaudacionTotal: 0 }
  );
  return {
    ...acc,
    recaudacionTotal: Number(acc.recaudacionTotal.toFixed(2))
  };
}

function normalizarCodigo(codigo) {
  return String(codigo ?? '').trim().toUpperCase().replace(/\s+/g, '-');
}

function normalizarTexto(texto) {
  return String(texto ?? '').trim().replace(/\s+/g, ' ');
}

function validarMenuPayload(body) {
  const detalles = [];
  const codigoRaw = typeof body?.codigo === 'string' ? normalizarCodigo(body.codigo) : '';
  const nombreRaw = typeof body?.nombre === 'string' ? normalizarTexto(body.nombre) : '';
  const descRaw = typeof body?.descripcion === 'string' ? normalizarTexto(body.descripcion) : '';
  const catRaw =
    body?.categoria === undefined
      ? 'Café de Especialidad'
      : typeof body.categoria === 'string'
        ? normalizarTexto(body.categoria) || 'Café de Especialidad'
        : '';
  const precioNum = Number(body?.precio);
  const porcionesNum = body?.porciones === undefined ? 0 : Number(body.porciones);
  const tiempoNum = body?.tiempoPreparacion === undefined ? 5 : Number(body.tiempoPreparacion);

  if (!codigoRaw) {
    detalles.push({ campo: 'codigo', mensaje: 'El código del plato/bebida es obligatorio.', codigo: 'too_small' });
  } else if (codigoRaw.length > 40) {
    detalles.push({ campo: 'codigo', mensaje: 'El código no puede exceder 40 caracteres.', codigo: 'too_big' });
  }

  if (!nombreRaw) {
    detalles.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio.', codigo: 'too_small' });
  } else if (nombreRaw.length > 120) {
    detalles.push({ campo: 'nombre', mensaje: 'El nombre no puede exceder 120 caracteres.', codigo: 'too_big' });
  }

  if (descRaw.length > 400) {
    detalles.push({ campo: 'descripcion', mensaje: 'La descripción no puede superar los 400 caracteres.', codigo: 'too_big' });
  }

  if (!catRaw) {
    detalles.push({ campo: 'categoria', mensaje: 'La categoría es obligatoria.', codigo: 'too_small' });
  }

  if (body?.precio === undefined || body?.precio === '' || Number.isNaN(precioNum)) {
    detalles.push({ campo: 'precio', mensaje: 'El precio debe ser un número válido.', codigo: 'invalid_type' });
  } else if (precioNum <= 0) {
    detalles.push({ campo: 'precio', mensaje: 'El precio debe ser mayor a 0.', codigo: 'too_small' });
  } else if (precioNum > 5000) {
    detalles.push({ campo: 'precio', mensaje: 'El precio no puede exceder 5,000.', codigo: 'too_big' });
  }

  if (Number.isNaN(porcionesNum) || !Number.isInteger(porcionesNum) || porcionesNum < 0 || porcionesNum > 10000) {
    detalles.push({ campo: 'porciones', mensaje: 'Las porciones deben ser un entero entre 0 y 10,000.', codigo: 'invalid_type' });
  }

  if (Number.isNaN(tiempoNum) || !Number.isInteger(tiempoNum) || tiempoNum < 1 || tiempoNum > 120) {
    detalles.push({ campo: 'tiempoPreparacion', mensaje: 'El tiempo de preparación debe estar entre 1 y 120 min.', codigo: 'invalid_type' });
  }

  if (detalles.length > 0) {
    return { valid: false, detalles };
  }

  return {
    valid: true,
    data: {
      codigo: codigoRaw,
      nombre: nombreRaw,
      descripcion: descRaw,
      categoria: catRaw,
      precio: Number(precioNum.toFixed(2)),
      porciones: porcionesNum,
      tiempoPreparacion: tiempoNum
    }
  };
}

function validarPedidoPayload(body) {
  const detalles = [];
  const clienteNombre = normalizarTexto(body?.clienteNombre || '');
  const tipoServicio = String(body?.tipoServicio || 'En mesa');
  const numeroMesa = normalizarTexto(body?.numeroMesa || '');
  const metodoPago = String(body?.metodoPago || 'Efectivo');
  const notas = normalizarTexto(body?.notas || '');
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!clienteNombre || clienteNombre.length < 2) {
    detalles.push({ campo: 'clienteNombre', mensaje: 'Indica el nombre del cliente o comensal.', codigo: 'too_small' });
  }
  if (!['En mesa', 'Para llevar', 'Domicilio'].includes(tipoServicio)) {
    detalles.push({ campo: 'tipoServicio', mensaje: 'Tipo de servicio inválido.', codigo: 'invalid_enum' });
  }
  if (tipoServicio === 'En mesa' && !numeroMesa) {
    detalles.push({ campo: 'numeroMesa', mensaje: 'Indica el número de mesa para consumo en local.', codigo: 'too_small' });
  }
  if (!['Efectivo', 'Tarjeta', 'Transferencia'].includes(metodoPago)) {
    detalles.push({ campo: 'metodoPago', mensaje: 'Método de pago inválido.', codigo: 'invalid_enum' });
  }
  if (items.length === 0) {
    detalles.push({ campo: 'items', mensaje: 'El pedido debe incluir al menos un ítem del menú.', codigo: 'too_small' });
  }

  if (detalles.length > 0) {
    return { valid: false, detalles };
  }

  return {
    valid: true,
    data: {
      clienteNombre,
      tipoServicio,
      numeroMesa: tipoServicio === 'En mesa' ? numeroMesa : '',
      metodoPago,
      notas,
      items: items.map((i) => ({
        menuId: Number(i.menuId),
        cantidad: Math.floor(Number(i.cantidad) || 0)
      }))
    }
  };
}

function errorPayload(codigo, mensaje, detalles = []) {
  return {
    ok: false,
    error: { codigo, mensaje, detalles },
    timestamp: new Date().toISOString()
  };
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const [k, ...rest] = part.trim().split('=');
    if (k) acc[k] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function getSessionUser(req) {
  const cookies = parseCookies(req);
  const sid = cookies['connect.sid'];
  if (!sid) return null;
  return sessions.get(sid) || null;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new SyntaxError('JSON inválido en el cuerpo de la solicitud.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(req, res, status, payload, extraHeaders = {}) {
  const origin = req.headers.origin;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' } : {}),
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    ...extraHeaders
  };
  res.writeHead(status, headers);
  res.end(JSON.stringify(payload));
}

function escaparCsv(val) {
  const s = val === null || val === undefined ? '' : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return `"${s}"`;
}

export async function handleCafeRequest(req, res) {
  const origin = req.headers.origin;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' } : {}),
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const { pathname, searchParams } = url;

  try {
    // Auth: POST /api/auth/login
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await readJsonBody(req);
      const detalles = [];
      if (!body?.username) detalles.push({ campo: 'username', mensaje: 'El usuario es obligatorio.', codigo: 'too_small' });
      if (!body?.password) detalles.push({ campo: 'password', mensaje: 'La contraseña es obligatoria.', codigo: 'too_small' });
      if (detalles.length > 0) {
        return sendJson(req, res, 400, errorPayload('VALIDACION_FALLIDA', 'Campos de acceso incompletos.', detalles));
      }

      const usuariosValidos = {
        barista: {
          password: 'cafe123',
          perfil: { id: 1, username: 'barista', nombre: 'Camila Mendoza', rol: 'barista-encargada' }
        },
        admin: {
          password: 'admin123',
          perfil: { id: 2, username: 'admin', nombre: 'Administrador AromaPOS', rol: 'administrador' }
        }
      };

      const match = usuariosValidos[String(body.username).trim()];
      if (!match || match.password !== body.password) {
        return sendJson(req, res, 401, errorPayload('NO_AUTORIZADO', 'Credenciales inválidas. Usa barista / cafe123.'));
      }

      const sid = crypto.randomUUID();
      const usuario = match.perfil;
      sessions.set(sid, usuario);

      return sendJson(
        req,
        res,
        200,
        { ok: true, data: usuario, meta: { mensaje: 'Turno iniciado en AromaPOS.' } },
        { 'Set-Cookie': `connect.sid=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax` }
      );
    }

    // Auth: GET /api/auth/me
    if (req.method === 'GET' && pathname === '/api/auth/me') {
      const usuario = getSessionUser(req);
      if (!usuario) {
        return sendJson(req, res, 200, { ok: true, data: null, meta: { activo: false } });
      }
      return sendJson(req, res, 200, { ok: true, data: usuario, meta: { activo: true } });
    }

    // Auth: POST /api/auth/logout
    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      const cookies = parseCookies(req);
      if (cookies['connect.sid']) sessions.delete(cookies['connect.sid']);
      return sendJson(
        req,
        res,
        200,
        { ok: true, data: { autenticado: false }, meta: { mensaje: 'Turno cerrado correctamente.' } },
        { 'Set-Cookie': 'connect.sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax' }
      );
    }

    // Menú: GET /api/menu/exportar/csv
    if (req.method === 'GET' && pathname === '/api/menu/exportar/csv') {
      const db = loadDb();
      const header = 'ID,Codigo,Nombre,Descripcion,Categoria,Precio,Porciones,TiempoMin,CreadoEn,ActualizadoEn';
      const rows = [...db.menu]
        .sort((a, b) => b.id - a.id)
        .map((p) =>
          [
            p.id,
            p.codigo,
            p.nombre,
            p.descripcion ?? '',
            p.categoria,
            p.precio,
            p.porciones,
            p.tiempoPreparacion,
            p.creado_en,
            p.actualizado_en
          ]
            .map(escaparCsv)
            .join(',')
        );
      const csv = rows.length ? [header, ...rows].join('\r\n') + '\r\n' : `${header}\n`;
      const filename = `carta_cafeteria_${new Date().toISOString().slice(0, 10)}.csv`;
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' } : {})
      });
      res.end(csv);
      return;
    }

    // Menú: GET /api/menu
    if (req.method === 'GET' && pathname === '/api/menu') {
      const db = loadDb();
      const busqueda = (searchParams.get('busqueda') || '').trim().toLowerCase();
      const categoria = (searchParams.get('categoria') || '').trim();

      const filtrados = db.menu
        .filter((p) => {
          const matchBusqueda =
            !busqueda ||
            p.nombre.toLowerCase().includes(busqueda) ||
            p.codigo.toLowerCase().includes(busqueda) ||
            (p.descripcion || '').toLowerCase().includes(busqueda);
          const matchCategoria = !categoria || p.categoria === categoria;
          return matchBusqueda && matchCategoria;
        })
        .sort((a, b) => b.id - a.id);

      return sendJson(req, res, 200, {
        ok: true,
        data: filtrados.map(enriquecerItemMenu),
        meta: { metricas: calcularMetricasMenu(filtrados) }
      });
    }

    // Menú: GET /api/menu/:id
    const matchMenuId = pathname.match(/^\/api\/menu\/(\d+)$/);
    if (req.method === 'GET' && matchMenuId) {
      const id = Number(matchMenuId[1]);
      const db = loadDb();
      const item = db.menu.find((p) => p.id === id);
      if (!item) {
        return sendJson(req, res, 404, errorPayload('NOT_FOUND', `Ítem de carta #${id} no encontrado.`));
      }
      return sendJson(req, res, 200, { ok: true, data: enriquecerItemMenu(item) });
    }

    // Menú: POST /api/menu (Protegido)
    if (req.method === 'POST' && pathname === '/api/menu') {
      if (!getSessionUser(req)) {
        return sendJson(req, res, 401, errorPayload('NO_AUTORIZADO', 'Inicia sesión como barista para modificar la carta.'));
      }
      const body = await readJsonBody(req);
      const val = validarMenuPayload(body);
      if (!val.valid) {
        return sendJson(req, res, 400, errorPayload('VALIDACION_FALLIDA', 'Revisa los campos del ítem de menú.', val.detalles));
      }

      const db = loadDb();
      if (db.menu.some((p) => p.codigo.toUpperCase() === val.data.codigo.toUpperCase())) {
        return sendJson(
          req,
          res,
          409,
          errorPayload('CODIGO_DUPLICADO', `Ya existe un ítem en la carta con el código '${val.data.codigo}'.`, [
            { campo: 'codigo', valor: val.data.codigo }
          ])
        );
      }

      const ahora = new Date().toISOString();
      const nuevo = {
        id: db.nextMenuId++,
        ...val.data,
        creado_en: ahora,
        actualizado_en: ahora
      };
      db.menu.push(nuevo);
      saveDb(db);

      return sendJson(req, res, 201, { ok: true, data: enriquecerItemMenu(nuevo) });
    }

    // Menú: PUT /api/menu/:id (Protegido)
    if (req.method === 'PUT' && matchMenuId) {
      if (!getSessionUser(req)) {
        return sendJson(req, res, 401, errorPayload('NO_AUTORIZADO', 'Inicia sesión como barista para actualizar la carta.'));
      }
      const id = Number(matchMenuId[1]);
      const db = loadDb();
      const idx = db.menu.findIndex((p) => p.id === id);
      if (idx === -1) {
        return sendJson(req, res, 404, errorPayload('NOT_FOUND', `Ítem de carta #${id} no existe.`));
      }

      const body = await readJsonBody(req);
      const val = validarMenuPayload(body);
      if (!val.valid) {
        return sendJson(req, res, 400, errorPayload('VALIDACION_FALLIDA', 'Revisa los campos enviados.', val.detalles));
      }

      const colision = db.menu.find((p) => p.id !== id && p.codigo.toUpperCase() === val.data.codigo.toUpperCase());
      if (colision) {
        return sendJson(
          req,
          res,
          409,
          errorPayload('CODIGO_DUPLICADO', `El código '${val.data.codigo}' pertenece a otro ítem (#${colision.id}).`, [
            { campo: 'codigo', valor: val.data.codigo }
          ])
        );
      }

      const actualizado = {
        ...db.menu[idx],
        ...val.data,
        actualizado_en: new Date().toISOString()
      };
      db.menu[idx] = actualizado;
      saveDb(db);

      return sendJson(req, res, 200, { ok: true, data: enriquecerItemMenu(actualizado) });
    }

    // Menú: DELETE /api/menu/:id (Protegido)
    if (req.method === 'DELETE' && matchMenuId) {
      if (!getSessionUser(req)) {
        return sendJson(req, res, 401, errorPayload('NO_AUTORIZADO', 'Inicia sesión como barista para retirar ítems de la carta.'));
      }
      const id = Number(matchMenuId[1]);
      const db = loadDb();
      const idx = db.menu.findIndex((p) => p.id === id);
      if (idx === -1) {
        return sendJson(req, res, 404, errorPayload('NOT_FOUND', `Ítem de carta #${id} no existe.`));
      }
      const [eliminado] = db.menu.splice(idx, 1);
      saveDb(db);

      return sendJson(req, res, 200, {
        ok: true,
        data: eliminado,
        meta: { mensaje: 'Ítem retirado de la carta correctamente.' }
      });
    }

    // Pedidos: GET /api/pedidos
    if (req.method === 'GET' && pathname === '/api/pedidos') {
      const db = loadDb();
      const ordenados = [...db.pedidos].sort((a, b) => b.id - a.id);
      return sendJson(req, res, 200, {
        ok: true,
        data: ordenados,
        meta: { resumen: calcularResumenPedidos(ordenados) }
      });
    }

    // Pedidos: POST /api/pedidos (Protegido)
    if (req.method === 'POST' && pathname === '/api/pedidos') {
      const usuario = getSessionUser(req);
      if (!usuario) {
        return sendJson(req, res, 401, errorPayload('NO_AUTORIZADO', 'Inicia sesión como barista para confirmar pedidos en cocina.'));
      }

      const body = await readJsonBody(req);
      const val = validarPedidoPayload(body);
      if (!val.valid) {
        return sendJson(req, res, 400, errorPayload('VALIDACION_FALLIDA', 'Datos del pedido inválidos.', val.detalles));
      }

      const db = loadDb();
      const lineas = [];
      let subtotal = 0;
      let impuesto = 0;
      let tiempoEstimadoMin = 0;

      // Verificar existencia y porciones disponibles antes de mutar
      for (const reqItem of val.data.items) {
        if (reqItem.cantidad <= 0) {
          return sendJson(req, res, 400, errorPayload('VALIDACION_FALLIDA', 'Todas las cantidades deben ser mayores a 0.'));
        }
        const menuItem = db.menu.find((m) => m.id === reqItem.menuId);
        if (!menuItem) {
          return sendJson(req, res, 404, errorPayload('NOT_FOUND', `El ítem de menú #${reqItem.menuId} ya no existe.`));
        }
        if (menuItem.porciones < reqItem.cantidad) {
          return sendJson(
            req,
            res,
            409,
            errorPayload(
              'PORCIONES_INSUFICIENTES',
              `Porciones insuficientes para '${menuItem.nombre}': disponibles ${menuItem.porciones}, solicitadas ${reqItem.cantidad}.`
            )
          );
        }

        const ivaUnit = calcularImpuesto(menuItem.precio);
        const subtotalLinea = Number((menuItem.precio * reqItem.cantidad).toFixed(2));
        subtotal += subtotalLinea;
        impuesto += Number((ivaUnit * reqItem.cantidad).toFixed(2));
        tiempoEstimadoMin = Math.max(tiempoEstimadoMin, Number(menuItem.tiempoPreparacion) || 3);

        lineas.push({
          menuId: menuItem.id,
          codigo: menuItem.codigo,
          nombre: menuItem.nombre,
          cantidad: reqItem.cantidad,
          precioUnitario: menuItem.precio,
          subtotalLinea
        });
      }

      // Descontar porciones atómicamente en memoria antes de guardar
      const ahora = new Date().toISOString();
      for (const reqItem of val.data.items) {
        const menuItem = db.menu.find((m) => m.id === reqItem.menuId);
        menuItem.porciones -= reqItem.cantidad;
        menuItem.actualizado_en = ahora;
      }

      subtotal = Number(subtotal.toFixed(2));
      impuesto = Number(impuesto.toFixed(2));
      const total = Number((subtotal + impuesto).toFixed(2));
      const ticketNum = db.nextPedidoNum++;

      const pedido = {
        id: ticketNum,
        ticket: `PED-${ticketNum}`,
        fecha: ahora,
        clienteNombre: val.data.clienteNombre,
        tipoServicio: val.data.tipoServicio,
        numeroMesa: val.data.numeroMesa,
        metodoPago: val.data.metodoPago,
        notas: val.data.notas,
        atendidoPor: usuario.nombre,
        estado: 'EN_PREPARACION',
        tiempoEstimadoMin,
        items: lineas,
        subtotal,
        impuesto,
        total
      };

      db.pedidos.push(pedido);
      saveDb(db);

      return sendJson(req, res, 201, {
        ok: true,
        data: pedido,
        meta: { mensaje: `Pedido ${pedido.ticket} enviado a barra/cocina.` }
      });
    }

    // Pedidos: PATCH /api/pedidos/:id/estado (Protegido)
    const matchPedidoEstado = pathname.match(/^\/api\/pedidos\/(\d+)\/estado$/);
    if (req.method === 'PATCH' && matchPedidoEstado) {
      if (!getSessionUser(req)) {
        return sendJson(req, res, 401, errorPayload('NO_AUTORIZADO', 'Inicia sesión para actualizar el estado del pedido.'));
      }
      const id = Number(matchPedidoEstado[1]);
      const body = await readJsonBody(req);
      const nuevoEstado = String(body?.estado || '');
      if (!['EN_PREPARACION', 'LISTO', 'ENTREGADO'].includes(nuevoEstado)) {
        return sendJson(
          req,
          res,
          400,
          errorPayload('VALIDACION_FALLIDA', 'Estado inválido. Usa EN_PREPARACION, LISTO o ENTREGADO.')
        );
      }

      const db = loadDb();
      const pedido = db.pedidos.find((p) => p.id === id);
      if (!pedido) {
        return sendJson(req, res, 404, errorPayload('NOT_FOUND', `Pedido #${id} no encontrado.`));
      }

      pedido.estado = nuevoEstado;
      pedido.actualizado_en = new Date().toISOString();
      saveDb(db);

      return sendJson(req, res, 200, { ok: true, data: pedido });
    }

    return sendJson(
      req,
      res,
      404,
      errorPayload('RUTA_NO_ENCONTRADA', `El endpoint '${req.method} ${pathname}' no existe en AromaPOS API.`)
    );
  } catch (err) {
    if (err instanceof SyntaxError) {
      return sendJson(req, res, 400, errorPayload('JSON_INVALIDO', err.message));
    }
    return sendJson(req, res, 500, errorPayload('INTERNAL_SERVER_ERROR', 'Error interno en AromaPOS API.'));
  }
}

export function createCafeServer() {
  return http.createServer(handleCafeRequest);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const server = createCafeServer();
  server.listen(PORT, () => {
    console.log(`[AromaPOS API] Escuchando en http://localhost:${PORT}`);
    console.log(`[AromaPOS API] Credenciales barista: barista / cafe123`);
  });
}
