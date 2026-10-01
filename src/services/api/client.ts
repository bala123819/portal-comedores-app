/**
 * Cliente HTTP de la API Mermab, ajustado a las reglas del Banco (docs/bda/04-05-cliente-y-uso.md).
 *
 * - Headers: `Accept` (+ `Content-Type` si hay body), `Authorization: Bearer` (Sanctum).
 *   NUNCA `X-API-Key` (son credenciales máquina-a-máquina del tenant).
 * - Desenvuelve `{ success, data, meta?, message?, errors? }`; pagina en las dos formas que usa la API.
 * - 401 con token → avisa al store de sesión (borra el token y vuelve a login).
 * - Se autolimita a 50 pedidos/min (el servidor corta a 60 y hoy responde 500 en vez de 429).
 * - GET: reintenta hasta 2 veces ante 500/429/red, con espera. Escrituras: nunca solas.
 * - POST: `Idempotency-Key` siempre (una por intención del usuario; se reusa en reintentos).
 */
import { env } from '@/lib/env';
import { ApiError, kindFromStatus } from './errors';
import { newIdempotencyKey } from './idempotency';
import type { Envelope, Meta, Page, QueryParams } from './types';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  formData?: FormData;
  /** POST: si no se pasa, se genera una. Para reintentos manuales, pasar la misma. */
  idempotencyKey?: string;
  /** false = no manda Authorization (health, login) */
  auth?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

type MockHandler = (method: HttpMethod, path: string, opts: RequestOptions) => Promise<Response>;

const state: {
  token: string | null;
  onUnauthorized: (() => void) | null;
  mock: MockHandler | null;
  sent: number[];
} = { token: null, onUnauthorized: null, mock: null, sent: [] };

export const apiConfig = {
  setToken(token: string | null) {
    state.token = token;
  },
  getToken() {
    return state.token;
  },
  onUnauthorized(handler: () => void) {
    state.onUnauthorized = handler;
  },
  setMockHandler(handler: MockHandler | null) {
    state.mock = handler;
  },
};

const MAX_PER_MINUTE = 50;
const GET_ATTEMPTS = 3;
const DEFAULT_TIMEOUT = 20_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** No pasar de 50 pedidos por minuto (ventana deslizante). */
async function throttle(): Promise<void> {
  const now = Date.now();
  state.sent = state.sent.filter((t) => now - t < 60_000);
  if (state.sent.length >= MAX_PER_MINUTE) {
    await sleep(60_000 - (now - state.sent[0]) + 50);
    return throttle();
  }
  state.sent.push(Date.now());
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = `${env.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `${url}?${params.join('&')}` : url;
}

function parseRetryAfter(value: string | null, bodyValue?: unknown): number | undefined {
  if (typeof bodyValue === 'number') return bodyValue;
  if (!value) return undefined;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return Math.max(0, Math.ceil(seconds));
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  return undefined;
}

async function doFetch(method: HttpMethod, path: string, opts: RequestOptions): Promise<Response> {
  if (state.mock) return state.mock(method, path, opts);
  await throttle();

  const headers: Record<string, string> = { Accept: 'application/json' };
  const hasBody = opts.body !== undefined || !!opts.formData;
  if (hasBody && !opts.formData) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false && state.token) headers.Authorization = `Bearer ${state.token}`;
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);

  try {
    return await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      body: opts.formData ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: controller.signal,
    });
  } catch (e) {
    if (opts.signal?.aborted) throw e;
    const aborted = (e as { name?: string })?.name === 'AbortError';
    throw new ApiError({ kind: aborted ? 'timeout' : 'network' });
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

export async function request<T>(
  method: HttpMethod,
  path: string,
  opts: RequestOptions = {},
): Promise<Envelope<T>> {
  const o: RequestOptions =
    method === 'POST' && !opts.idempotencyKey ? { ...opts, idempotencyKey: newIdempotencyKey() } : opts;
  const attempts = method === 'GET' ? GET_ATTEMPTS : 1;

  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await doFetch(method, path, o);
    } catch (e) {
      if (method === 'GET' && attempt < attempts && e instanceof ApiError) {
        await sleep(attempt * 1000);
        continue;
      }
      throw e;
    }

    const text = await res.text();
    let json: (Partial<Envelope<T>> & { code?: string; error?: string; retry_after?: number }) | null =
      null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }

    if (res.ok) {
      // /health no usa el envoltorio: lo normalizamos.
      if (json && typeof json === 'object' && 'data' in json) return json as Envelope<T>;
      return { success: true, data: (json ?? {}) as T, message: json?.message };
    }

    const retryAfter = parseRetryAfter(res.headers.get('Retry-After'), json?.retry_after);
    // Hoy el servidor responde 500 al pasarse del límite de pedidos: en GET se reintenta con espera.
    if (method === 'GET' && (res.status === 500 || res.status === 429) && attempt < attempts) {
      await sleep((retryAfter ?? attempt * 2) * 1000);
      continue;
    }

    const code = json?.code ?? json?.error;
    if (res.status === 400 && (code === 'IDEMPOTENCY_KEY_REQUIRED' || /idempotency/i.test(text))) {
      console.error(`[api] BUG: ${method} ${path} requiere Idempotency-Key`);
    }
    if (res.status === 403 && __DEV__) {
      // Según el Banco, un 403 es un bug de la app: llamó a una ruta que este rol no usa.
      console.warn(`[api] 403 en ${method} ${path}: ¿módulo apagado que se está llamando?`);
    }
    if (res.status === 401 && o.auth !== false && state.token) state.onUnauthorized?.();

    throw new ApiError({
      kind: kindFromStatus(res.status),
      status: res.status,
      serverMessage: typeof json?.message === 'string' ? json.message : undefined,
      fieldErrors: json?.errors,
      retryAfter,
      code,
    });
  }
}

/**
 * La API pagina de dos formas:
 * - familias: `{ data: [...], meta }`
 * - avisos:   `{ data: { data: [...], meta } }`
 */
export function toPage<T>(env: Envelope<unknown>): Page<T> {
  const d = env.data as unknown;
  let items: T[] = [];
  let meta: Meta | undefined = env.meta;
  if (Array.isArray(d)) items = d as T[];
  else if (d && typeof d === 'object' && Array.isArray((d as { data?: unknown }).data)) {
    items = (d as { data: T[] }).data;
    meta = (d as { meta?: Meta }).meta ?? meta;
  }
  return {
    items,
    meta: meta ?? { current_page: 1, last_page: 1, per_page: items.length, total: items.length },
  };
}

export const api = {
  async get<T>(path: string, query?: QueryParams, opts: RequestOptions = {}): Promise<T> {
    return (await request<T>('GET', path, { ...opts, query })).data;
  },
  async getPage<T>(path: string, query?: QueryParams, opts: RequestOptions = {}): Promise<Page<T>> {
    return toPage<T>(await request<unknown>('GET', path, { ...opts, query }));
  },
  async post<T>(path: string, body: unknown, idempotencyKey: string, opts: RequestOptions = {}) {
    return (await request<T>('POST', path, { ...opts, body, idempotencyKey })).data;
  },
  async put<T>(path: string, body: unknown, idempotencyKey?: string, opts: RequestOptions = {}) {
    return (await request<T>('PUT', path, { ...opts, body, idempotencyKey })).data;
  },
  async del<T>(path: string, idempotencyKey?: string, opts: RequestOptions = {}) {
    return (await request<T>('DELETE', path, { ...opts, idempotencyKey })).data;
  },
  /** Descarga binaria autenticada (documentos, PDF). Devuelve el Response crudo. */
  async raw(path: string, opts: RequestOptions = {}): Promise<Response> {
    const res = await doFetch('GET', path, opts);
    if (!res.ok) {
      if (res.status === 401 && state.token) state.onUnauthorized?.();
      throw new ApiError({ kind: kindFromStatus(res.status), status: res.status });
    }
    return res;
  },
  url: buildUrl,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Un id que no es UUID hace que el servidor responda 500: validarlo antes (docs/bda trampa 2). */
export const isUuid = (v: string) => UUID_RE.test(v);
