import { onlineManager, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/components/ui';
import { qk } from '@/features/query-keys';
import {
  ACTION_INVALIDATES,
  assistant,
  assistantErrorMessage,
  isAssistantError,
  isWriteAction,
  type ChatTurn,
  type Conversation,
  type InvalidationTarget,
  type PendingApproval,
} from '@/services/assistant';
import type { LocalAttachment } from './attachments';
import { saveConversation } from './history';

export const assistantKeys = {
  all: ['assistant'] as const,
  session: ['assistant', 'session'] as const,
  conversation: ['assistant', 'conversation'] as const,
  messages: (id: string) => ['assistant', 'messages', id] as const,
  approvals: (id: string) => ['assistant', 'approvals', id] as const,
};

/** Polling del contrato §4: 1,5 s mientras hay un turno en curso, 5 s si no. Se corta en segundo plano. */
const FAST_MS = 1500;
const SLOW_MS = 5000;

/** Qué consultas de la app refrescar cuando el asistente guardó algo (ACTION_INVALIDATES del contrato). */
const APP_QUERIES: Record<InvalidationTarget, QueryKey[]> = {
  families: [qk.familiesAll, qk.orgProfile, qk.orgStats, ['family-member-search']],
  distributions: [qk.distributionsAll, qk.quota, qk.orgStats, qk.receivedAll],
  interactions: [qk.interactionsAll],
};

/** Mensaje que la persona mandó y todavía no aparece en el historial del servidor. */
export interface OutgoingMessage {
  clientMessageId: string;
  text: string;
  attachments: LocalAttachment[];
  state: 'sending' | 'sent' | 'failed';
  error?: string;
  /** Falló por falta de red: se reintenta solo al volver la conexión */
  network?: boolean;
  serverId?: string;
}

/** Historial acumulado de la conversación (lo que guarda la consulta de mensajes). */
interface ChatLog {
  paused: boolean;
  turns: Record<string, ChatTurn>;
  /** `before` para pedir la página anterior; null = no hay más */
  olderCursor: number | null;
}

const byId = (list: ChatTurn[]) => Object.fromEntries(list.map((t) => [t.id, t]));
const isActive = (t: ChatTurn) => t.status === 'pending' || t.status === 'running';
const lastUserTurn = (log: ChatLog) =>
  Object.values(log.turns)
    .filter((t) => t.role === 'user')
    .sort((a, b) => b.sequence - a.sequence)[0];
const newClientId = () => randomUUID();

export function useAssistantChat() {
  const qc = useQueryClient();

  // ─── Sesión y conversación ───
  const sessionQ = useQuery({
    queryKey: assistantKeys.session,
    queryFn: () => assistant.ensureSession(),
    staleTime: Infinity,
    retry: 1,
  });

  const conversationQ = useQuery({
    queryKey: assistantKeys.conversation,
    enabled: sessionQ.isSuccess,
    staleTime: Infinity,
    retry: 1,
    // Se retoma la más reciente; si no hay ninguna, se crea una.
    queryFn: async (): Promise<Conversation> => {
      const list = await assistant.listConversations();
      return list[0] ?? (await assistant.createConversation());
    },
  });
  const conversationId = conversationQ.data?.id;

  const [loadingOlder, setLoadingOlder] = useState(false);
  const [outbox, setOutbox] = useState<OutgoingMessage[]>([]);
  const [retryingTurn, setRetryingTurn] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [deciding, setDeciding] = useState<Record<string, boolean>>({});
  /** serverId → datos del envío, para reintentar un turno fallido con el MISMO clientMessageId */
  const sentInfo = useRef(new Map<string, { clientMessageId: string; text: string; attachmentIds?: string[] }>());
  /** Ids ya subidos por adjunto (clave local → id del servidor), para no volver a subir al reintentar */
  const uploaded = useRef(new Map<string, string>());

  /** Hay un turno en curso: el último de la persona está pending/running, o un envío todavía no aparece. */
  const computeBusy = (log: ChatLog | undefined) => {
    const lastUser = log ? lastUserTurn(log) : undefined;
    return (
      (!!lastUser && isActive(lastUser)) ||
      outbox.some((o) => o.state === 'sending' || (o.state === 'sent' && !log?.turns[o.serverId!])) ||
      retryingTurn !== null
    );
  };

  // ─── Turnos: cada consulta suma lo nuevo a lo que ya había, así el historial no tiene huecos ───
  const messagesKey = assistantKeys.messages(conversationId ?? '');
  const messagesQ = useQuery({
    queryKey: messagesKey,
    enabled: !!conversationId,
    queryFn: async (): Promise<ChatLog> => {
      const page = await assistant.getMessages(conversationId!);
      const prev = qc.getQueryData<ChatLog>(messagesKey);
      return {
        paused: page.paused,
        turns: { ...prev?.turns, ...byId(page.messages) },
        olderCursor: prev ? prev.olderCursor : page.nextBefore,
      };
    },
    refetchInterval: (q) => (computeBusy(q.state.data) ? FAST_MS : SLOW_MS),
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const log = messagesQ.data;
  const turns = useMemo(() => Object.values(log?.turns ?? {}).sort((a, b) => a.sequence - b.sequence), [log]);
  const pendingOutbox = outbox.filter((o) => !(o.serverId && log?.turns[o.serverId]));
  const busy = computeBusy(log);
  const olderCursor = log?.olderCursor ?? null;

  const approvalsQ = useQuery({
    queryKey: assistantKeys.approvals(conversationId ?? ''),
    enabled: !!conversationId,
    queryFn: () => assistant.listApprovals(conversationId!),
    refetchInterval: busy ? FAST_MS : SLOW_MS,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const refreshNow = useCallback(() => {
    if (!conversationId) return;
    void qc.invalidateQueries({ queryKey: assistantKeys.messages(conversationId) });
    void qc.invalidateQueries({ queryKey: assistantKeys.approvals(conversationId) });
  }, [qc, conversationId]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || olderCursor == null || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await assistant.getMessages(conversationId, olderCursor);
      const key = assistantKeys.messages(conversationId);
      qc.setQueryData<ChatLog>(key, (prev) =>
        prev
          ? { ...prev, turns: { ...byId(page.messages), ...prev.turns }, olderCursor: page.nextBefore }
          : prev,
      );
    } catch (e) {
      toast.error(assistantErrorMessage(e));
    } finally {
      setLoadingOlder(false);
    }
  }, [qc, conversationId, olderCursor, loadingOlder]);

  const newConversation = useCallback(async (): Promise<string | null> => {
    try {
      const c = await assistant.createConversation();
      qc.setQueryData(assistantKeys.conversation, c);
      setOutbox([]);
      setLimitReached(false);
      sentInfo.current.clear();
      uploaded.current.clear();
      return c.id;
    } catch (e) {
      toast.error(assistantErrorMessage(e));
      return null;
    }
  }, [qc]);

  // ─── Envío ───
  const patch = (clientMessageId: string, p: Partial<OutgoingMessage>) =>
    setOutbox((all) => all.map((o) => (o.clientMessageId === clientMessageId ? { ...o, ...p } : o)));

  const deliver = useCallback(
    async (item: OutgoingMessage, firstConvId: string): Promise<void> => {
      patch(item.clientMessageId, { state: 'sending', error: undefined, network: false });
      let convId = firstConvId;
      // Como mucho dos vueltas: la segunda sólo si la conversación estaba cerrada y se abrió otra.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const attachmentIds: string[] = [];
          for (const a of item.attachments) {
            let id = uploaded.current.get(a.key);
            if (!id) {
              id = (await assistant.uploadAttachment(convId, a)).id;
              uploaded.current.set(a.key, id);
            }
            attachmentIds.push(id);
          }
          const body = {
            clientMessageId: item.clientMessageId,
            text: item.text,
            attachmentIds: attachmentIds.length ? attachmentIds : undefined,
          };
          const res = await assistant.sendMessage(convId, body);
          sentInfo.current.set(res.id, body);
          patch(item.clientMessageId, { state: 'sent', serverId: res.id });
          void qc.invalidateQueries({ queryKey: assistantKeys.messages(convId) });
          return;
        } catch (e) {
          if (attempt === 0 && isAssistantError(e) && e.code === 'CONVERSATION_CLOSED') {
            // La conversación se cerró: se abre otra y se manda ahí (los adjuntos se vuelven a subir).
            toast.info(assistantErrorMessage(e));
            const id = await newConversation();
            if (id) {
              item.attachments.forEach((a) => uploaded.current.delete(a.key));
              setOutbox([{ ...item, state: 'sending' }]);
              convId = id;
              continue;
            }
          }
          if (isAssistantError(e) && e.code === 'SESSION_LIMIT') setLimitReached(true);
          if (__DEV__ && isAssistantError(e) && e.code === 'IDEMPOTENCY_CONFLICT') {
            console.warn('[asistente] mismo clientMessageId con otro texto', item.clientMessageId);
          }
          patch(item.clientMessageId, {
            state: 'failed',
            error: assistantErrorMessage(e),
            network: isAssistantError(e) && e.isNetwork,
          });
          return;
        }
      }
    },
    [qc, newConversation],
  );

  /** Devuelve false si no se pudo mandar (turno en curso o sin conversación). */
  const send = useCallback(
    (text: string, attachments: LocalAttachment[] = []): boolean => {
      const t = text.trim();
      if (!conversationId || busy || !t || limitReached) return false;
      const item: OutgoingMessage = { clientMessageId: newClientId(), text: t, attachments, state: 'sending' };
      setOutbox((all) => [...all, item]);
      void deliver(item, conversationId);
      return true;
    },
    [conversationId, busy, limitReached, deliver],
  );

  /** Reintenta un envío que no llegó, con el MISMO clientMessageId (así no se duplica). */
  const retryOutgoing = useCallback(
    (clientMessageId: string) => {
      const item = outbox.find((o) => o.clientMessageId === clientMessageId);
      if (item && conversationId) void deliver(item, conversationId);
    },
    [outbox, conversationId, deliver],
  );

  /** Reintenta un turno que el asistente no pudo responder (status failed). */
  const retryTurn = useCallback(
    async (turn: ChatTurn) => {
      if (!conversationId || retryingTurn) return;
      const body = sentInfo.current.get(turn.id) ?? {
        // Si se mandó en otra sesión de la app no conocemos su clientMessageId: va como mensaje nuevo.
        clientMessageId: newClientId(),
        text: turn.text,
        attachmentIds: turn.attachments.length ? turn.attachments.map((a) => a.id) : undefined,
      };
      setRetryingTurn(turn.id);
      try {
        const res = await assistant.sendMessage(conversationId, body);
        sentInfo.current.set(res.id, body);
      } catch (e) {
        toast.error(assistantErrorMessage(e));
      } finally {
        setRetryingTurn(null);
        refreshNow();
      }
    },
    [conversationId, retryingTurn, refreshNow],
  );

  // Al volver la conexión se reintentan solos los envíos que fallaron por falta de red.
  useEffect(
    () =>
      onlineManager.subscribe((online) => {
        if (!online || !conversationId) return;
        outbox.filter((o) => o.state === 'failed' && o.network).forEach((o) => void deliver(o, conversationId));
      }),
    [outbox, conversationId, deliver],
  );

  // ─── Tarjetas de confirmación ───
  const decide = useCallback(
    async (a: PendingApproval, approve: boolean) => {
      if (!conversationId || deciding[a.id]) return;
      setDeciding((d) => ({ ...d, [a.id]: true }));
      try {
        // Nunca se reintenta solo: una decisión repetida podría guardar dos veces.
        const { status } = await assistant.decideApproval(conversationId, a.id, { approve });
        if ((status === 'completed' || status === 'uncertain') && isWriteAction(a.action)) {
          for (const target of ACTION_INVALIDATES[a.action]) {
            for (const queryKey of APP_QUERIES[target]) void qc.invalidateQueries({ queryKey });
          }
        }
        if (status === 'completed') toast.success('Listo, quedó guardado.');
        else if (status === 'rejected') toast.info('Cancelado. No se guardó nada.');
        else if (status === 'failed') toast.error('No se pudo guardar. Probá de nuevo más tarde.');
        else toast.info('No sabemos si se guardó. Revisá la pantalla correspondiente antes de volver a intentar.');
      } catch (e) {
        if (isAssistantError(e) && e.code === 'APPROVAL_UNAVAILABLE') toast.info('Esa tarjeta ya no está disponible.');
        else toast.error(assistantErrorMessage(e));
      } finally {
        await Promise.all([
          qc.invalidateQueries({ queryKey: assistantKeys.approvals(conversationId) }),
          qc.invalidateQueries({ queryKey: assistantKeys.messages(conversationId) }),
        ]);
        setDeciding((d) => ({ ...d, [a.id]: false }));
      }
    },
    [conversationId, deciding, qc],
  );

  // ─── Historial en el dispositivo: la conversación se copia a medida que avanza (history.ts) ───
  useEffect(() => {
    if (!conversationId || assistant.mode !== 'http' || !turns.length) return;
    void saveConversation(conversationId, turns).catch(() => {});
  }, [conversationId, turns]);

  // Cada sesión (1 h) tiene su propia identidad: al renovarse, la conversación anterior da 404 (P-36).
  // Entonces se sigue en una conversación nueva; la anterior queda en el historial del dispositivo.
  const recovering = useRef<string | null>(null);
  const lostConversation =
    !!conversationId && isAssistantError(messagesQ.error) && messagesQ.error.status === 404;
  useEffect(() => {
    if (!lostConversation || recovering.current === conversationId) return;
    recovering.current = conversationId ?? null;
    void newConversation();
  }, [lostConversation, conversationId, newConversation]);

  const startError = sessionQ.error ?? conversationQ.error;

  return {
    mode: assistant.mode,
    session: sessionQ.data,
    starting: !startError && (sessionQ.isPending || conversationQ.isPending),
    startError,
    retryStart: () => {
      if (sessionQ.error) void sessionQ.refetch();
      else void conversationQ.refetch();
    },
    conversationId,
    turns,
    outbox: pendingOutbox,
    approvals: approvalsQ.data ?? [],
    paused: !!(messagesQ.data?.paused ?? conversationQ.data?.paused),
    loadingHistory: !!conversationId && messagesQ.isPending,
    hasOlder: olderCursor != null,
    loadingOlder,
    loadOlder,
    busy,
    limitReached,
    retryingTurn,
    deciding,
    send,
    retryOutgoing,
    retryTurn,
    decide,
    newConversation,
  };
}
