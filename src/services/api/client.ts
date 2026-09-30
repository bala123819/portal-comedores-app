/**
 * Cliente HTTP de la API Mermab.
 *
 * - Headers: `Accept` y `Content-Type: application/json`, `Authorization: Bearer` (Sanctum).
 *   NUNCA `X-API-Key` (son credenciales máquina-a-máquina del tenant).
 * - Desenvuelve `{ success, data, meta?, message?, errors? }`.
 * - 401 → avisa al store de sesión (limpia y vuelve a login).
 * - 429 → espera `Retry-After` y reintenta (máx. 2 veces, con la MISMA Idempotency-Key).
 * - Mutaciones: `Idempotency-Key` obligatoria en POST, recomendada en PUT/DELETE.
 */
import { env } from '@/lib/env';
import { ApiError, kindFromStatus } from './errors';
import type { Envelope, Page, QueryParams } from './types';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  formData?: FormData;
  /** Requerida en POST mutantes. Generarla una vez por intención y reusarla en reintentos. */
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
} = { token: null, onUnauthorized: null, mock: null };

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

const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_AUTO_WAIT_SECONDS = 30;
const DEFAULT_TIMEOUT = 20_000;

function buildUrl(path: string, query?: QueryParams): string {
  const url = `${env.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `${url}?${params.join('&')}` : url;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return Math.max(0, Math.ceil(seconds));
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  return undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function doFetch(method: HttpMethod, path: string, opts: RequestOptions): Promise<Response> {
  if (state.mock) return state.mock(method, path, opts);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (!opts.formData) headers['Content-Type'] = 'application/json';
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
  if (method === 'POST' && !opts.idempotencyKey && opts.auth !== false && __DEV__) {
    console.warn(`[api] POST ${path} sin Idempotency-Key`);
  }

  for (let attempt = 0; ; attempt++) {
    const res = await doFetch(method, path, opts);
    const text = await res.text();
    let json: Partial<Envelope<T>> & { code?: string; error?: string } = {};
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = {};
      }
    }

    if (res.ok) {
      // Algunos endpoints (health) no usan el envoltorio: lo normalizamos.
      if (json && typeof json === 'object' && 'data' in json) return json as Envelope<T>;
      return { success: true, data: json as T };
    }

    const kind = kindFromStatus(res.status);
    const retryAfter = parseRetryAfter(res.headers.get('Retry-After'));

    if (
      kind === 'rate_limit' &&
      attempt < MAX_RATE_LIMIT_RETRIES &&
      (retryAfter ?? 5) <= MAX_AUTO_WAIT_SECONDS
    ) {
      await sleep((retryAfter ?? 5) * 1000);
      continue;
    }

    const code = json.code ?? json.error;
    if (res.status === 400 && (code === 'IDEMPOTENCY_KEY_REQUIRED' || /idempotency/i.test(text))) {
      // Es un bug nuestro: toda mutación debe llevar la key.
      console.error(`[api] BUG: ${method} ${path} requiere Idempotency-Key`);
    }

    if (kind === 'unauthorized' && opts.auth !== false) state.onUnauthorized?.();

    throw new ApiError({
      kind,
      status: res.status,
      serverMessage: typeof json.message === 'string' ? json.message : undefined,
      fieldErrors: json.errors,
      retryAfter,
      code,
    });
  }
}

function toPage<T>(env: Envelope<T[]>): Page<T> {
  const items = Array.isArray(env.data) ? env.data : [];
  return {
    items,
    meta: env.meta ?? { current_page: 1, last_page: 1, per_page: items.length, total: items.length },
  };
}

export const api = {
  async get<T>(path: string, query?: QueryParams, opts: RequestOptions = {}): Promise<T> {
    return (await request<T>('GET', path, { ...opts, query })).data;
  },
  async getPage<T>(path: string, query?: QueryParams, opts: RequestOptions = {}): Promise<Page<T>> {
    return toPage(await request<T[]>('GET', path, { ...opts, query }));
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
      if (res.status === 401) state.onUnauthorized?.();
      throw new ApiError({ kind: kindFromStatus(res.status), status: res.status });
    }
    return res;
  },
  url: buildUrl,
};
