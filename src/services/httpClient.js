/**
 * Cliente HTTP centralizado sobre Fetch API.
 * - Valida explícitamente `response.ok`
 * - Normaliza errores de la API PW2 ({ ok: false, error: { codigo, mensaje, detalles } })
 * - Incluye `credentials: 'include'` para sesiones express-session
 * - Previene condiciones de carrera mediante AbortController + secuencia monotónica
 */

export class ApiError extends Error {
  /**
   * @param {string} mensaje
   * @param {{
   *   status?: number,
   *   codigo?: string,
   *   detalles?: Array<{ campo?: string, mensaje?: string, codigo?: string, valor?: unknown }>,
   *   timestamp?: string,
   *   isNetworkError?: boolean
   * }} [options]
   */
  constructor(mensaje, options = {}) {
    super(mensaje);
    this.name = 'ApiError';
    this.mensaje = mensaje;
    this.status = options.status ?? 0;
    this.codigo = options.codigo ?? 'HTTP_ERROR';
    this.detalles = Array.isArray(options.detalles) ? options.detalles : [];
    this.timestamp = options.timestamp ?? new Date().toISOString();
    this.isNetworkError = Boolean(options.isNetworkError);
  }
}

export function isAbortError(error) {
  return Boolean(error && (error.name === 'AbortError' || error.code === 'ABORT_ERR'));
}

export function resolveApiBaseUrl() {
  const configured =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_API_BASE_URL
      : undefined;
  return (configured || '/api').replace(/\/+$/, '');
}

function buildUrl(baseUrl, endpoint, query) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullPath = `${baseUrl}${cleanEndpoint}`;

  if (!query || typeof query !== 'object') {
    return fullPath;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value).trim());
    }
  }

  const qs = params.toString();
  return qs ? `${fullPath}?${qs}` : fullPath;
}

async function parseResponseBody(response) {
  const contentType = response.headers?.get?.('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Ejecuta una petición HTTP centralizada validando `response.ok`.
 */
export async function httpRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    query,
    signal,
    timeoutMs = 12000,
    baseUrl = resolveApiBaseUrl(),
    fetchImpl = globalThis.fetch,
    headers: customHeaders = {}
  } = options;

  if (typeof fetchImpl !== 'function') {
    throw new ApiError('Fetch API no disponible en este entorno.', {
      codigo: 'FETCH_UNAVAILABLE',
      isNetworkError: true
    });
  }

  const url = buildUrl(baseUrl, endpoint, query);
  const timeoutController = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => {
    timeoutController.abort(signal?.reason);
  };

  if (signal) {
    if (signal.aborted) {
      throw signal.reason instanceof Error
        ? signal.reason
        : new DOMException('La petición fue cancelada.', 'AbortError');
    }
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timerId = setTimeout(() => {
    timedOut = true;
    timeoutController.abort(new DOMException('Tiempo de espera agotado.', 'TimeoutError'));
  }, timeoutMs);

  const headers = {
    Accept: 'application/json',
    ...customHeaders
  };

  const fetchInit = {
    method,
    headers,
    credentials: 'include',
    signal: timeoutController.signal
  };

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
    fetchInit.body = JSON.stringify(body);
  }

  try {
    const response = await fetchImpl(url, fetchInit);
    const payload = await parseResponseBody(response);

    if (!response.ok) {
      const apiErr = payload && typeof payload === 'object' ? payload.error : null;
      throw new ApiError(
        apiErr?.mensaje || `Error HTTP ${response.status} al consultar ${endpoint}.`,
        {
          status: response.status,
          codigo: apiErr?.codigo || `HTTP_${response.status}`,
          detalles: apiErr?.detalles || [],
          timestamp: payload?.timestamp
        }
      );
    }

    if (payload && typeof payload === 'object' && payload.ok === false) {
      throw new ApiError(payload.error?.mensaje || 'La API respondió con un error de negocio.', {
        status: response.status,
        codigo: payload.error?.codigo || 'API_ERROR',
        detalles: payload.error?.detalles || [],
        timestamp: payload.timestamp
      });
    }

    return {
      data: payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload,
      meta: payload && typeof payload === 'object' && 'meta' in payload ? payload.meta : null,
      headers: response.headers,
      fromOfflineCache: response.headers?.get?.('X-AromaPOS-Offline-Cache') === 'HIT',
      cachedAt: response.headers?.get?.('X-AromaPOS-Cached-At') || null
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (timedOut) {
      throw new ApiError('La petición excedió el tiempo máximo de espera.', {
        status: 0,
        codigo: 'TIMEOUT_ERROR',
        isNetworkError: true
      });
    }

    if (isAbortError(error) || signal?.aborted) {
      throw error;
    }

    throw new ApiError(
      'No fue posible conectar con el servidor API. Verifica que esté activo o tu conexión a internet.',
      {
        status: 0,
        codigo: 'NETWORK_ERROR',
        isNetworkError: true
      }
    );
  } finally {
    clearTimeout(timerId);
    if (signal) {
      signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * Crea un canal de peticiones seguro contra condiciones de carrera ("Last-One-Wins"):
 * - Aborta automáticamente la petición anterior en curso mediante AbortController.
 * - Valida un contador de secuencia monotónico para descartar respuestas obsoletas.
 */
export function createLatestRequestGuard() {
  let currentController = null;
  let latestSeq = 0;

  return {
    /**
     * Ejecuta `task(signal, seq)`. Retorna `{ cancelled: true }` si fue superada.
     */
    async run(task) {
      if (currentController) {
        currentController.abort(new DOMException('Petición reemplazada por una más reciente.', 'AbortError'));
      }

      const controller = new AbortController();
      currentController = controller;
      const seq = ++latestSeq;

      try {
        const value = await task(controller.signal);
        if (controller.signal.aborted || seq !== latestSeq) {
          return { stale: true, value: null };
        }
        return { stale: false, value };
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted || seq !== latestSeq) {
          return { stale: true, value: null };
        }
        throw error;
      } finally {
        if (currentController === controller) {
          currentController = null;
        }
      }
    },

    abort() {
      latestSeq += 1;
      if (currentController) {
        currentController.abort(new DOMException('Canal cancelado.', 'AbortError'));
        currentController = null;
      }
    }
  };
}
