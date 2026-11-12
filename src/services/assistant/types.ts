/**
 * Tipos del chat con el asistente (GoDubi webchat). Copia del contrato v2 del 11/11/2026
 * (`docs/asistente/asistente-contrato.ts`), verificado con llamadas reales.
 */

// ─── Sesión ──────────────────────────────────────────────────────────────────
export interface BootstrapRequest {
  publicationId: string;
  origin: string;
  /** PKCE: base64url(SHA-256(verifier)) */
  challenge: string;
}
export interface BootstrapResponse {
  bootstrapId: string;
  expiresAt: string;
  name: string;
  welcome: string;
  appearance: null;
  allowAnonymous: boolean;
}
export interface ExchangeRequest {
  bootstrapId: string;
  verifier: string;
  /** Más adelante: identificación con el login de Mermab. Hoy no se manda. */
  code?: string;
}
export interface AssistantSession {
  token: string;
  /** Hoy 1 h. Se usa este campo, nunca un número fijo. */
  expiresAt: string;
  authenticated: boolean;
  /** Clave opaca para separar caché por identidad */
  identityKey: string;
  name: string;
  welcome: string;
  attachmentsAllowed: boolean;
  appearance: null;
}

// ─── Conversaciones y mensajes ───────────────────────────────────────────────
export interface Conversation {
  id: string;
  /** true = una persona del Banco tomó la conversación */
  paused: boolean;
  createdAt?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  size: number;
}

export interface SendMessageRequest {
  /** [A-Za-z0-9_-], ≤100. El MISMO al reintentar. */
  clientMessageId: string;
  text: string;
  attachmentIds?: string[];
}
export type MessageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'waiting';
export interface SendMessageResponse {
  id: string;
  status: MessageStatus;
}

export interface ChatTurn {
  id: string;
  sequence: number;
  /** user: la respuesta viene en `response`. assistant: turno del sistema tras una tarjeta. operator: persona del Banco. */
  role: 'user' | 'operator' | 'assistant';
  text: string;
  status: MessageStatus;
  /** Markdown. Crece mientras status = 'running'. */
  response: string | null;
  errorCode: string | null;
  updatedAt: string;
  attachments: { id: string; filename: string; mimeType: string; size: number }[];
}
export interface MessagesPage {
  paused: boolean;
  /** null = no hay más historial */
  nextBefore: number | null;
  /** Del más viejo al más nuevo */
  messages: ChatTurn[];
}

// ─── Tarjetas de confirmación ───────────────────────────────────────────────
export type WriteAction =
  | 'mermab_create_org_family'
  | 'mermab_update_org_family'
  | 'mermab_create_family_member'
  | 'mermab_bulk_family_members'
  | 'mermab_update_family_member'
  | 'mermab_create_distribution'
  | 'mermab_create_organization_interaction';

export interface PendingApproval {
  id: string;
  /** No mostrar: usar ACTION_LABELS */
  label: string;
  /** No mostrar */
  connectionName: string;
  action: WriteAction | string;
  /** Los datos EXACTOS que se van a guardar */
  input: Record<string, unknown>;
  /** 10 min; vencida deja de aparecer */
  expiresAt: string;
}
export interface ApprovalDecision {
  approve: boolean;
}
export interface ApprovalDecisionResponse {
  status: 'completed' | 'failed' | 'rejected' | 'uncertain';
}

export const ACTION_LABELS: Record<WriteAction, string> = {
  mermab_create_org_family: 'Dar de alta una familia',
  mermab_update_org_family: 'Modificar una familia',
  mermab_create_family_member: 'Agregar un integrante',
  mermab_bulk_family_members: 'Agregar integrantes',
  mermab_update_family_member: 'Modificar un integrante',
  mermab_create_distribution: 'Hacer un pedido al Banco',
  mermab_create_organization_interaction: 'Enviar un aviso al Banco',
};

export type InvalidationTarget = 'families' | 'distributions' | 'interactions';

/** Qué datos de la app quedan desactualizados cuando una tarjeta termina en completed o uncertain. */
export const ACTION_INVALIDATES: Record<WriteAction, InvalidationTarget[]> = {
  mermab_create_org_family: ['families'],
  mermab_update_org_family: ['families'],
  mermab_create_family_member: ['families'],
  mermab_bulk_family_members: ['families'],
  mermab_update_family_member: ['families'],
  mermab_create_distribution: ['distributions'],
  mermab_create_organization_interaction: ['interactions'],
};

export function isWriteAction(a: string): a is WriteAction {
  return a in ACTION_LABELS;
}

// ─── Cliente ─────────────────────────────────────────────────────────────────
export interface LocalFile {
  uri: string;
  name: string;
  type: string;
}

export interface AssistantClient {
  /** 'http' (API real) o 'mock' (simulado, sin red) */
  readonly mode: 'http' | 'mock';
  /** Devuelve la sesión vigente; si no hay o está por vencer, arma una nueva (bootstrap + exchange). */
  ensureSession(): Promise<AssistantSession>;
  /** Fuerza una sesión nueva. */
  startSession(): Promise<AssistantSession>;
  /** Cierra la sesión en el servidor (si hay) y borra lo guardado en el dispositivo. */
  logout(): Promise<void>;
  listConversations(): Promise<Conversation[]>;
  createConversation(): Promise<Conversation>;
  getMessages(conversationId: string, before?: number): Promise<MessagesPage>;
  sendMessage(conversationId: string, body: SendMessageRequest): Promise<SendMessageResponse>;
  uploadAttachment(conversationId: string, file: LocalFile): Promise<Attachment>;
  listApprovals(conversationId: string): Promise<PendingApproval[]>;
  decideApproval(conversationId: string, approvalId: string, d: ApprovalDecision): Promise<ApprovalDecisionResponse>;
}
