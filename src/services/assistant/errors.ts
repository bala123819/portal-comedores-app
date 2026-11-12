/**
 * Errores de la API del asistente. El cuerpo es `{ statusCode, message, error }` y el código
 * viene en `message` (p. ej. 403 SESSION_EXPIRED). Se ramifica por los dos.
 */
export const SESSION_ERROR_CODES = new Set(['INVALID_CREDENTIAL', 'SESSION_EXPIRED', 'SESSION_REVOKED']);

/** status 0 = no hubo respuesta (sin red, CORS en web o tiempo agotado). */
export class AssistantError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: number;

  constructor(status: number, code: string, retryAfter?: number) {
    super(`${status} ${code}`);
    this.name = 'AssistantError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }

  get isNetwork() {
    return this.status === 0;
  }
  get isSession() {
    return this.status === 403 && SESSION_ERROR_CODES.has(this.code);
  }
  get isRateLimit() {
    return this.status === 429;
  }
}

export function isAssistantError(e: unknown): e is AssistantError {
  return e instanceof AssistantError;
}

export function is(e: unknown, code: string): boolean {
  return isAssistantError(e) && e.code === code;
}

/** Mensaje para la persona, en lenguaje simple. Nunca muestra el código crudo. */
export function assistantErrorMessage(e: unknown): string {
  if (!isAssistantError(e)) return 'Algo salió mal. Intentá de nuevo.';
  if (e.isNetwork) return 'El asistente no está disponible ahora. Revisá tu conexión.';
  if (e.isRateLimit) return 'Mandaste muchos mensajes seguidos. Esperá unos segundos y probá de nuevo.';
  switch (e.code) {
    case 'TURN_BUSY':
      return 'El asistente todavía está respondiendo. Esperá a que termine.';
    case 'SESSION_LIMIT':
      return 'Esta conversación llegó a su límite de mensajes. Empezá una nueva.';
    case 'CONVERSATION_CLOSED':
      return 'La conversación se cerró. Empezamos una nueva.';
    case 'UNSUPPORTED_ATTACHMENT':
      return 'Ese tipo de archivo no se puede mandar. Usá una foto (JPG, PNG o WEBP) o un PDF.';
    case 'APPROVAL_UNAVAILABLE':
      return 'Esa tarjeta ya no está disponible.';
  }
  if (e.status === 413) return 'El archivo es muy grande. El máximo es 10 MB.';
  if (e.status >= 500) return 'El asistente no está disponible ahora. Probá en unos minutos.';
  return 'Algo salió mal. Intentá de nuevo.';
}
