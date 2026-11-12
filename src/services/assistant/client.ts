import { Platform } from 'react-native';
import { storage } from '@/services/storage';
import { AssistantError, is } from './errors';
import { createPkcePair } from './pkce';
import type {
  AssistantClient,
  ApprovalDecisionResponse,
  AssistantSession,
  Attachment,
  BootstrapResponse,
  Conversation,
  LocalFile,
  MessagesPage,
  PendingApproval,
  SendMessageResponse,
} from './types';

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface AssistantClientConfig {
  mode: 'http' | 'mock';
  baseUrl: string;
  publicationId: string;
  origin: string;
  /** fetch real o el simulado de `mock.ts` */
  fetch: FetchLike;
}

const SESSION_KEY = 'pc.assistant.session';
/** Se renueva un minuto antes de que venza (contrato §3.5). */
const RENEW_BEFORE_MS = 60_000;
const TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 90_000;

/**
 * Cliente del chat con el asistente. La sesión del chat es independiente del token de Mermab:
 * nunca se mezclan. Se guarda en secure-store (localStorage en web).
 */
export function createAssistantClient(cfg: AssistantClientConfig): AssistantClient {
  let session: AssistantSession | null = null;
  let loaded = false;
  /** Evita armar dos sesiones a la vez si varias consultas arrancan juntas. */
  let inFlight: Promise<AssistantSession> | null = null;

  async function call<T>(
    method: 'GET' | 'POST',
    path: string,
    opts: { token?: string; json?: unknown; form?: FormData; timeout?: number } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    let body: BodyInit | undefined;
    if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.json);
    } else if (opts.form) {
      body = opts.form; // el boundary del multipart lo pone fetch
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeout ?? TIMEOUT_MS);
    let res: Response;
    try {
      res = await cfg.fetch(`${cfg.baseUrl}${path}`, { method, headers, body, signal: ctrl.signal });
    } catch {
      // Sin red, tiempo agotado o (en web) bloqueo por CORS: no hay respuesta que leer.
      throw new AssistantError(0, 'NETWORK');
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const code = (data as { message?: unknown } | null)?.message;
      const retryAfter = Number(res.headers.get('retry-after')) || undefined;
      throw new AssistantError(res.status, typeof code === 'string' ? code : `HTTP_${res.status}`, retryAfter);
    }
    return data as T;
  }

  async function load() {
    if (loaded) return;
    loaded = true;
    const raw = await storage.getSecure(SESSION_KEY);
    if (!raw) return;
    try {
      session = JSON.parse(raw) as AssistantSession;
    } catch {
      session = null;
    }
  }

  async function save(s: AssistantSession | null) {
    session = s;
    if (s) await storage.setSecure(SESSION_KEY, JSON.stringify(s));
    else await storage.removeSecure(SESSION_KEY);
  }

  /** bootstrap + exchange. Ante AUTHORIZATION_CONTEXT_MISMATCH se repite desde el bootstrap una vez. */
  async function createSession(attempt = 0): Promise<AssistantSession> {
    const { verifier, challenge } = await createPkcePair();
    const boot = await call<BootstrapResponse>('POST', '/bootstrap', {
      json: { publicationId: cfg.publicationId, origin: cfg.origin, challenge },
    });
    try {
      const s = await call<AssistantSession>('POST', '/sessions/exchange', {
        json: { bootstrapId: boot.bootstrapId, verifier },
      });
      await save(s);
      return s;
    } catch (e) {
      if (attempt === 0 && is(e, 'AUTHORIZATION_CONTEXT_MISMATCH')) return createSession(1);
      throw e;
    }
  }

  function startSession(): Promise<AssistantSession> {
    if (!inFlight) {
      inFlight = createSession().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  }

  async function ensureSession(): Promise<AssistantSession> {
    await load();
    if (session && new Date(session.expiresAt).getTime() - RENEW_BEFORE_MS > Date.now()) return session;
    return startSession();
  }

  /** Pedido con sesión: ante 403 de sesión vencida/revocada/inválida, sesión nueva en silencio y UN reintento. */
  async function authed<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const s = await ensureSession();
    try {
      return await fn(s.token);
    } catch (e) {
      if (e instanceof AssistantError && e.isSession) {
        const fresh = await startSession();
        return fn(fresh.token);
      }
      throw e;
    }
  }

  const client: AssistantClient = {
    mode: cfg.mode,
    ensureSession,
    startSession,

    async logout() {
      await load();
      const token = session?.token;
      await save(null);
      if (!token) return;
      try {
        await call('POST', '/sessions/logout', { token });
      } catch {
        // Si falla (sin red o ya vencida) igual queda borrada en el dispositivo.
      }
    },

    listConversations: () => authed((token) => call<Conversation[]>('GET', '/conversations', { token })),

    createConversation: () => authed((token) => call<Conversation>('POST', '/conversations', { token })),

    getMessages: (id, before) =>
      authed((token) =>
        call<MessagesPage>(
          'GET',
          `/conversations/${encodeURIComponent(id)}/messages${before != null ? `?before=${before}` : ''}`,
          { token },
        ),
      ),

    sendMessage: (id, body) =>
      authed((token) =>
        call<SendMessageResponse>('POST', `/conversations/${encodeURIComponent(id)}/messages`, { token, json: body }),
      ),

    uploadAttachment: (id, file) =>
      authed(async (token) => {
        // Se arma de nuevo en cada intento: un FormData ya enviado no se puede reutilizar.
        const form = new FormData();
        if (Platform.OS === 'web') {
          const blob = await (await fetch(file.uri)).blob();
          form.append('file', blob, file.name);
        } else {
          // React Native acepta { uri, name, type } como archivo del multipart.
          form.append('file', file as unknown as Blob);
        }
        return call<Attachment>('POST', `/conversations/${encodeURIComponent(id)}/attachments`, {
          token,
          form,
          timeout: UPLOAD_TIMEOUT_MS,
        });
      }),

    listApprovals: (id) =>
      authed((token) => call<PendingApproval[]>('GET', `/conversations/${encodeURIComponent(id)}/approvals`, { token })),

    decideApproval: (id, approvalId, d) =>
      authed((token) =>
        call<ApprovalDecisionResponse>('POST', `/conversations/${encodeURIComponent(id)}/approvals/${encodeURIComponent(approvalId)}`, {
          token,
          json: d,
        }),
      ),
  };
  return client;
}

export type { LocalFile };
