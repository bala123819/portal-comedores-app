/**
 * Chat con el asistente (GoDubi) — contrato DEFINITIVO para la app de organizaciones (v2, 11/11/2026).
 *
 * Es la API real, ya en línea. Todas las respuestas de este archivo salen de llamadas reales.
 * Todo pedido lleva `Content-Type: application/json` salvo la subida de archivos (multipart).
 * Todo pedido, salvo bootstrap y exchange, lleva `Authorization: Bearer <session.token>`.
 */

// ─────────────────────────────── Configuración ───────────────────────────────
export const ASSISTANT_BASE_URL = 'https://webchat.godubi.com/v1/webchat';
export const ASSISTANT_PUBLICATION_ID = '9806bc2a-7c76-4fe2-8d7a-79ae79544419';
export const ASSISTANT_ORIGIN = 'https://app-organizaciones.mermab.com'; // va en el body del bootstrap
// Probar en celular o emulador (Expo Go / build nativo). Desde Expo web el navegador lo bloquea por CORS.

// ─────────────────────────────── Sesión ───────────────────────────────

/** POST /bootstrap → 201. El bootstrapId vive 60 s y se usa UNA vez. */
export interface BootstrapRequest {
  publicationId: string;
  origin: string;
  challenge: string; // PKCE: base64url(SHA-256(verifier)), 43 caracteres
}
export interface BootstrapResponse {
  bootstrapId: string;
  expiresAt: string;
  name: string;      // "App de organizaciones — tesis"
  welcome: string;   // texto para la conversación vacía
  appearance: null;
  allowAnonymous: boolean;
}

/** POST /sessions/exchange → 201. Reusar un bootstrapId da 403 AUTHORIZATION_CONTEXT_MISMATCH. */
export interface ExchangeRequest {
  bootstrapId: string;
  verifier: string; // PKCE: base64url de 32 bytes al azar, 43 caracteres
  code?: string;    // MÁS ADELANTE (identificación por el login de Mermab). Hoy no se manda.
}
export interface AssistantSession {
  token: string;
  expiresAt: string;          // hoy dura 1 h. Usen este campo, no un número fijo.
  authenticated: boolean;     // hoy false
  identityKey: string;        // clave opaca para separar caché por identidad
  name: string;
  welcome: string;
  attachmentsAllowed: boolean;
  appearance: null;
}
/** POST /sessions/logout → 201 { success: true }. Después, el token da 403 SESSION_EXPIRED. */

// ─────────────────────────────── Conversaciones ───────────────────────────────

/** GET /conversations → 200 Conversation[] (máx. 30, la más nueva primero). POST /conversations → 201 { id, paused }. */
export interface Conversation {
  id: string;
  paused: boolean; // true = una persona del Banco tomó la conversación
  createdAt?: string;
}

/** POST /conversations/{id}/attachments — multipart, campo "file" → 201. */
export interface Attachment {
  id: string;
  filename: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'; // se detecta por contenido
  size: number; // máx. 10 MB. Otro tipo → 400 UNSUPPORTED_ATTACHMENT
}

/** POST /conversations/{id}/messages → 201 { id, status: 'pending' } */
export interface SendMessageRequest {
  clientMessageId: string;  // [A-Za-z0-9_-], ≤100. El MISMO al reintentar (si no, se duplica)
  text: string;             // 1..8000
  attachmentIds?: string[]; // hasta 4
}
export interface SendMessageResponse { id: string; status: MessageStatus; }

export type MessageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'waiting';

/** GET /conversations/{id}/messages?before=<sequence> → 200 */
export interface ChatTurn {
  id: string;
  sequence: number;
  role: 'user' | 'operator' | 'assistant';
  // user: lo que escribió la persona; la respuesta del asistente viene en `response`.
  // assistant: turno que agrega el sistema después de confirmar una tarjeta; mostrar `response`.
  // operator: mensaje de una persona del Banco.
  text: string;
  status: MessageStatus;
  response: string | null; // markdown. Crece mientras status = 'running'
  errorCode: string | null;
  updatedAt: string;
  attachments: Array<{ id: string; filename: string; mimeType: string; size: number }>;
}
export interface MessagesPage {
  paused: boolean;
  nextBefore: number | null; // null = no hay más historial
  messages: ChatTurn[];      // del más viejo al más nuevo
}

// ─────────────────────────────── Tarjetas de confirmación ───────────────────────────────

/** GET /conversations/{id}/approvals → 200 PendingApproval[] (vacío si no hay nada pendiente) */
export interface PendingApproval {
  id: string;
  label: string;          // hoy viene igual que `action`: usen ACTION_LABELS
  connectionName: string; // no mostrar
  action: WriteAction;
  input: Record<string, unknown>; // los datos EXACTOS que se van a guardar
  expiresAt: string;      // 10 min; vencida, deja de aparecer
}
/** POST /conversations/{id}/approvals/{approvalId} { approve } → 201 */
export interface ApprovalDecision { approve: boolean; }
export interface ApprovalDecisionResponse {
  status: 'completed' | 'failed' | 'rejected' | 'uncertain';
  // completed: aparece un turno nuevo role 'assistant' con la respuesta (seguir el polling).
  // rejected: no se guardó nada. failed: no se pudo guardar.
  // uncertain: no se sabe si se guardó → refrescar la pantalla correspondiente antes de reintentar.
}

export type WriteAction =
  | 'mermab_create_org_family'
  | 'mermab_update_org_family'
  | 'mermab_create_family_member'
  | 'mermab_bulk_family_members'
  | 'mermab_update_family_member'
  | 'mermab_create_distribution'
  | 'mermab_create_organization_interaction';

export const ACTION_LABELS: Record<WriteAction, string> = {
  mermab_create_org_family: 'Dar de alta una familia',
  mermab_update_org_family: 'Modificar una familia',
  mermab_create_family_member: 'Agregar un integrante',
  mermab_bulk_family_members: 'Agregar integrantes',
  mermab_update_family_member: 'Modificar un integrante',
  mermab_create_distribution: 'Hacer un pedido al Banco',
  mermab_create_organization_interaction: 'Enviar un aviso al Banco',
};
/** Qué invalidar (TanStack Query) cuando una tarjeta termina en completed o uncertain. */
export const ACTION_INVALIDATES: Record<WriteAction, string[]> = {
  mermab_create_org_family: ['families'],
  mermab_update_org_family: ['families'],
  mermab_create_family_member: ['families'],
  mermab_bulk_family_members: ['families'],
  mermab_update_family_member: ['families'],
  mermab_create_distribution: ['distributions'],
  mermab_create_organization_interaction: ['interactions'],
};

// ─────────────────────────────── Errores ───────────────────────────────
/** Cuerpo: { statusCode, message, error }. Ramifiquen por statusCode + message. */
export type AssistantErrorCode =
  | 'INVALID_CREDENTIAL' | 'SESSION_EXPIRED' | 'SESSION_REVOKED' // 403 → nueva sesión y reintentar una vez
  | 'AUTHORIZATION_CONTEXT_MISMATCH'   // 403 en exchange → repetir bootstrap
  | 'TURN_BUSY'                        // 409 → esperar a que termine el turno
  | 'IDEMPOTENCY_CONFLICT'             // 409 → mismo clientMessageId con otro texto (bug de la app)
  | 'CONVERSATION_CLOSED'              // 409 → crear conversación nueva
  | 'SESSION_LIMIT'                    // 403 → ofrecer conversación nueva
  | 'APPROVAL_UNAVAILABLE'             // 409 → la tarjeta ya se decidió o venció: refrescar la lista
  | 'UNSUPPORTED_ATTACHMENT'           // 400 → tipo de archivo no permitido
  | string;

// ─────────────────────────────── Cliente ───────────────────────────────
export interface AssistantClient {
  startSession(): Promise<AssistantSession>; // bootstrap + exchange
  logout(): Promise<void>;
  listConversations(): Promise<Conversation[]>;
  createConversation(): Promise<Conversation>;
  getMessages(conversationId: string, before?: number): Promise<MessagesPage>;
  sendMessage(conversationId: string, body: SendMessageRequest): Promise<SendMessageResponse>;
  uploadAttachment(conversationId: string, file: { uri: string; name: string; type: string }): Promise<Attachment>;
  listApprovals(conversationId: string): Promise<PendingApproval[]>;
  decideApproval(conversationId: string, approvalId: string, d: ApprovalDecision): Promise<ApprovalDecisionResponse>;
}

/** MÁS ADELANTE: identificación con el login de Mermab. Se suma entre bootstrap y exchange; las pantallas no cambian. */
export interface IdentityProvider { authorize(bootstrapId: string): Promise<{ code: string }>; }

// ─────────────────────────────── PKCE (Expo) ───────────────────────────────
// import * as Crypto from 'expo-crypto';
// const toB64Url = (b64: string) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// const verifier = toB64Url(Buffer.from(Crypto.getRandomBytes(32)).toString('base64'));
// const challenge = toB64Url(await Crypto.digestStringAsync(
//   Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 }));

// ─────────────────────────────── Prueba rápida (curl) ───────────────────────────────
// B=https://webchat.godubi.com/v1/webchat
// V=$(openssl rand 32 | base64 | tr '+/' '-_' | tr -d '=')
// C=$(printf %s "$V" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')
// BID=$(curl -s -X POST $B/bootstrap -H 'Content-Type: application/json' \
//   -d "{\"publicationId\":\"9806bc2a-7c76-4fe2-8d7a-79ae79544419\",\"origin\":\"https://app-organizaciones.mermab.com\",\"challenge\":\"$C\"}" | jq -r .bootstrapId)
// T=$(curl -s -X POST $B/sessions/exchange -H 'Content-Type: application/json' -d "{\"bootstrapId\":\"$BID\",\"verifier\":\"$V\"}" | jq -r .token)
// CID=$(curl -s -X POST $B/conversations -H "Authorization: Bearer $T" | jq -r .id)
// curl -s -X POST $B/conversations/$CID/messages -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
//   -d '{"clientMessageId":"prueba1","text":"¿Qué familias tenemos?"}'
// curl -s $B/conversations/$CID/messages -H "Authorization: Bearer $T" | jq   # repetir hasta status completed

// ─────────────────────────────── Escenarios del mock ───────────────────────────────
// Mantengan el MockAssistantClient para desarrollar sin red: 1 respuesta que crece, 2 con foto,
// 3 failed + Reintentar con el MISMO clientMessageId, 4 TURN_BUSY, 5 paused/operator, 6 sesión vencida
// (403) → renovación silenciosa, 7 429, 8 sin conexión, 9 tarjeta confirmada → turno assistant,
// 10 tarjeta rechazada, 11 tarjeta vencida, 12 logout.
