import { storage } from '@/services/storage';
import type { ChatTurn } from '@/services/assistant';

/**
 * Historial de chats con el asistente, guardado en el dispositivo.
 *
 * La API no lo da: cada sesión del chat (dura 1 h) tiene su propia identidad, y una sesión nueva ve
 * `GET /conversations → []` y recibe 404 al pedir los mensajes de una conversación anterior
 * (verificado el 2026-11-12, P-36). Por eso cada conversación se va copiando acá a medida que
 * avanza, y las anteriores se pueden releer (sólo lectura). Se borra al cerrar sesión (P-22).
 */
const KEY = 'pc.assistant.history';
const MAX_CONVERSATIONS = 30;

export interface SavedTurn {
  id: string;
  role: ChatTurn['role'];
  text: string;
  response: string | null;
}

export interface SavedConversation {
  id: string;
  /** Primer mensaje de la persona, recortado */
  title: string;
  updatedAt: string;
  turns: SavedTurn[];
}

export async function loadHistory(): Promise<SavedConversation[]> {
  const raw = await storage.get(KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as SavedConversation[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const titleOf = (turns: ChatTurn[]) => {
  const first =
    turns.find((t) => t.role === 'user' && t.text.trim())?.text.trim() ?? 'Conversación';
  return first.length > 70 ? `${first.slice(0, 67)}…` : first;
};

/** Guarda (o actualiza) una conversación. Sólo los turnos terminados: lo que está en curso se guarda después. */
export async function saveConversation(id: string, turns: ChatTurn[]): Promise<void> {
  const done = turns.filter((t) => t.status === 'completed' || t.role !== 'user');
  if (!done.length) return;
  const entry: SavedConversation = {
    id,
    title: titleOf(done),
    updatedAt: done[done.length - 1].updatedAt || new Date().toISOString(),
    turns: done.map((t) => ({ id: t.id, role: t.role, text: t.text, response: t.response })),
  };
  const rest = (await loadHistory()).filter((c) => c.id !== id);
  const list = [entry, ...rest]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_CONVERSATIONS);
  await storage.set(KEY, JSON.stringify(list));
}

export async function clearHistory(): Promise<void> {
  await storage.remove(KEY);
}
