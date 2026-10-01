import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { MutationCache, QueryCache, QueryClient, type Query } from '@tanstack/react-query';
import { isApiError } from './api/errors';
import { storage, STORAGE_KEYS } from './storage';

/**
 * El cliente HTTP ya reintenta cada GET hasta 2 veces ante 500/429/red (docs/bda 4/6).
 * Acá sólo se agrega un reintento más, espaciado, para cortes de red; nunca en ráfaga
 * (el servidor corta a 60 pedidos/min y responde 500).
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!isApiError(error)) return failureCount < 1;
  return (error.kind === 'network' || error.kind === 'timeout') && failureCount < 1;
}

function retryDelay(attempt: number, error: unknown): number {
  if (isApiError(error) && error.kind === 'rate_limit' && error.retryAfter) {
    return error.retryAfter * 1000;
  }
  // backoff exponencial con jitter: ~1s, ~2s, ~4s (tope 15s)
  return Math.min(15_000, 1000 * 2 ** attempt) + Math.random() * 400;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache(),
  mutationCache: new MutationCache(),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: shouldRetry,
      retryDelay,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Las mutaciones no se reintentan solas: el usuario reintenta con la misma Idempotency-Key.
      retry: false,
    },
  },
});

/** Adaptador de storage para el persister (AsyncStorage en nativo, localStorage en web) */
const persisterStorage = {
  getItem: (key: string) => storage.get(key),
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.remove(key),
};

export const persister = createAsyncStoragePersister({
  storage: persisterStorage,
  key: STORAGE_KEYS.queryCache,
  throttleTime: 2000,
});

/** Solo se persisten las lecturas marcadas con `meta: { persist: true }` (mermas, retiros, etc.) */
export function shouldPersistQuery(query: Query): boolean {
  return query.state.status === 'success' && query.meta?.persist === true;
}

export async function clearPersistedCache() {
  await persister.removeClient();
}

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { persist?: boolean };
  }
}
