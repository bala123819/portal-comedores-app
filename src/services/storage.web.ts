/**
 * Storage web: wrapper sobre localStorage (expo-secure-store no existe en web).
 * El token queda en localStorage del origen de la PWA; la API usa Bearer, no cookies.
 */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const ls = (): Storage | null =>
  safe(() => (typeof window !== 'undefined' ? window.localStorage : null), null);

export const storage = {
  async getSecure(key: string): Promise<string | null> {
    return safe(() => ls()?.getItem(key) ?? null, null);
  },
  async setSecure(key: string, value: string): Promise<void> {
    safe(() => ls()?.setItem(key, value), undefined);
  },
  async removeSecure(key: string): Promise<void> {
    safe(() => ls()?.removeItem(key), undefined);
  },
  async get(key: string): Promise<string | null> {
    return safe(() => ls()?.getItem(key) ?? null, null);
  },
  async set(key: string, value: string): Promise<void> {
    safe(() => ls()?.setItem(key, value), undefined);
  },
  async remove(key: string): Promise<void> {
    safe(() => ls()?.removeItem(key), undefined);
  },
};

export const STORAGE_KEYS = {
  token: 'pc.token',
  tokenIssuedAt: 'pc.tokenIssuedAt',
  queryCache: 'pc.queryCache',
  prefs: 'pc.prefs',
} as const;
