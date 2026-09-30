export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'rate_limit'
  | 'bad_request'
  | 'conflict'
  | 'server'
  | 'unknown';

interface ApiErrorInit {
  kind: ApiErrorKind;
  status?: number;
  message?: string;
  serverMessage?: string;
  fieldErrors?: Record<string, string[]>;
  retryAfter?: number;
  code?: string;
}

const HUMAN_MESSAGES: Record<ApiErrorKind, string> = {
  network: 'No hay conexión. Revisá tu internet e intentá de nuevo.',
  timeout: 'La conexión está muy lenta. Intentá de nuevo en un momento.',
  unauthorized: 'Tu sesión terminó. Volvé a ingresar.',
  forbidden: 'No tenés permiso para hacer esto.',
  not_found: 'No encontramos lo que buscabas. Puede que ya no esté disponible.',
  validation: 'Revisá los datos marcados.',
  rate_limit: 'Hiciste muchos pedidos seguidos. Esperá un momento y volvé a intentar.',
  bad_request: 'No pudimos procesar el pedido.',
  conflict: 'Esta acción ya no se puede hacer en el estado actual.',
  server: 'El sistema del Banco tuvo un problema. Intentá de nuevo en unos minutos.',
  unknown: 'Algo salió mal. Intentá de nuevo.',
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  /** Mensaje tal como vino del backend (en español); se muestra si es útil */
  readonly serverMessage?: string;
  readonly fieldErrors?: Record<string, string[]>;
  readonly retryAfter?: number;
  readonly code?: string;

  constructor(init: ApiErrorInit) {
    super(init.message ?? HUMAN_MESSAGES[init.kind]);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.serverMessage = init.serverMessage;
    this.fieldErrors = init.fieldErrors;
    this.retryAfter = init.retryAfter;
    this.code = init.code;
  }

  /** ¿Tiene sentido reintentar automáticamente? */
  get isTransient(): boolean {
    return this.kind === 'network' || this.kind === 'timeout' || this.kind === 'server';
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/**
 * Mensaje para mostrar al usuario. Para 422 y 409 el backend manda mensajes de negocio en
 * español ("Solo se pueden editar mermas activas"), que son más útiles que el genérico.
 */
export function humanMessage(e: unknown): string {
  if (!isApiError(e)) return HUMAN_MESSAGES.unknown;
  if (
    (e.kind === 'validation' || e.kind === 'conflict' || e.kind === 'bad_request') &&
    e.serverMessage &&
    !/^(the given data|validation|server error)/i.test(e.serverMessage)
  ) {
    return e.serverMessage;
  }
  if (e.kind === 'rate_limit' && e.retryAfter) {
    return `Hiciste muchos pedidos seguidos. Probá de nuevo en ${e.retryAfter} segundos.`;
  }
  return e.message;
}

export function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400) return 'bad_request';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  return 'unknown';
}
