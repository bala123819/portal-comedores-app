import { create } from 'zustand';
import { apiConfig } from '@/services/api/client';
import { authApi, orgApi } from '@/services/api/endpoints';
import { isApiError } from '@/services/api/errors';
import { queryClient, clearPersistedCache } from '@/services/query-client';
import { storage, STORAGE_KEYS } from '@/services/storage';
import type { Organization } from '@/features/org/types';
import { extractToken, meSchema, type Me } from './types';

/**
 * El token dura 24 h (docs/bda 2/6). Se rota con POST /auth/refresh al abrir la app si tiene
 * más de 12 h; el anterior deja de servir en el acto, por eso se guarda el nuevo antes de seguir.
 */
const REFRESH_AFTER_MS = 12 * 60 * 60 * 1000;

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionState {
  status: Status;
  me: Me | null;
  organization: Organization | null;
  /** false = el usuario no pertenece a una organización (la app es solo para organizaciones) */
  hasOrganization: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: (opts?: { remote?: boolean }) => Promise<void>;
  reloadMe: () => Promise<void>;
  setOrganization: (org: Organization) => void;
}

async function saveToken(token: string) {
  apiConfig.setToken(token);
  await storage.setSecure(STORAGE_KEYS.token, token);
  await storage.set(STORAGE_KEYS.tokenIssuedAt, String(Date.now()));
}

async function loadProfile(): Promise<{ me: Me; organization: Organization | null }> {
  const raw = await authApi.me();
  const parsed = meSchema.safeParse(raw);
  if (!parsed.success && __DEV__) {
    console.warn('[auth] /auth/me no coincide con el schema esperado', parsed.error.issues);
  }
  const me = (parsed.success ? parsed.data : raw) as Me;
  // La pertenencia a una organización se confirma con el Portal Organización:
  // si /org/profile responde 403/404, el usuario no es de una organización.
  try {
    const { organization } = await orgApi.profile();
    return { me, organization: organization ?? null };
  } catch (e) {
    if (isApiError(e) && (e.kind === 'forbidden' || e.kind === 'not_found')) {
      return { me, organization: null };
    }
    throw e;
  }
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading',
  me: null,
  organization: null,
  hasOrganization: true,

  async hydrate() {
    const token = await storage.getSecure(STORAGE_KEYS.token);
    if (!token) {
      set({ status: 'signedOut' });
      return;
    }
    apiConfig.setToken(token);
    try {
      const issuedAt = Number((await storage.get(STORAGE_KEYS.tokenIssuedAt)) ?? 0);
      if (Date.now() - issuedAt > REFRESH_AFTER_MS) {
        const fresh = extractToken(await authApi.refresh());
        if (fresh) await saveToken(fresh);
      }
      const { me, organization } = await loadProfile();
      set({ status: 'signedIn', me, organization, hasOrganization: organization !== null });
    } catch (e) {
      if (isApiError(e) && e.kind === 'unauthorized') {
        await get().signOut({ remote: false });
        return;
      }
      // Sin red: entramos igual con lo que haya en cache; las pantallas muestran el estado offline.
      set({ status: 'signedIn' });
    }
  },

  async signIn(email, password) {
    const data = await authApi.login({ email, password });
    const token = extractToken(data);
    if (!token) throw new Error('La respuesta de login no trajo un token');
    await saveToken(token);
    const { me, organization } = await loadProfile();
    set({ status: 'signedIn', me, organization, hasOrganization: organization !== null });
  },

  async signOut({ remote = true } = {}) {
    if (remote && apiConfig.getToken()) {
      try {
        await authApi.logout();
      } catch {
        // si falla (sin red / token vencido) igual cerramos localmente
      }
    }
    apiConfig.setToken(null);
    await storage.removeSecure(STORAGE_KEYS.token);
    await storage.remove(STORAGE_KEYS.tokenIssuedAt);
    queryClient.clear();
    await clearPersistedCache();
    set({ status: 'signedOut', me: null, organization: null, hasOrganization: true });
  },

  async reloadMe() {
    const { me, organization } = await loadProfile();
    set({ me, organization, hasOrganization: organization !== null });
  },

  setOrganization(organization) {
    set({ organization });
  },
}));

// 401 en cualquier request → limpiar sesión y volver a login
apiConfig.onUnauthorized(() => {
  if (useSession.getState().status === 'signedIn') {
    void useSession.getState().signOut({ remote: false });
  }
});
