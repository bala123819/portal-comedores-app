/**
 * Interacciones de la organización con el Banco, según las respuestas REALES de `/org/interactions`
 * (docs/bda/08-interacciones.md). No están en el OpenAPI: los tipos se escriben a mano.
 */

export const INTERACTION_TYPES = ['suceso', 'solicitud', 'consulta', 'reclamo'] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_STATUSES = ['pendiente', 'atendida'] as const;
export type InteractionStatus = (typeof INTERACTION_STATUSES)[number];

/** Límites del backend (422 si se pasan) */
export const TITLE_MAX = 255;
export const NOTES_MAX = 5000;

export interface Interaction {
  id: string;
  interaction_type: InteractionType | string;
  /** Etiqueta lista para mostrar que manda la API ("Solicitud") */
  type_label?: string | null;
  title: string;
  notes?: string | null;
  status: InteractionStatus | string;
  attended_at?: string | null;
  created_by?: { id: string; name: string } | null;
  created_at?: string | null;
}

export interface InteractionsFilter {
  type?: InteractionType;
  status?: InteractionStatus;
}

export interface InteractionsSummary {
  total: number;
  pendientes: number;
  by_type: Partial<Record<InteractionType, { total: number; pendientes: number }>>;
  by_month: { month: string; total: number }[];
}

/** Body de `POST /org/interactions` */
export interface CreateInteractionBody {
  interaction_type: InteractionType;
  title: string;
  notes?: string | null;
}

export function isInteractionType(v: unknown): v is InteractionType {
  return typeof v === 'string' && (INTERACTION_TYPES as readonly string[]).includes(v);
}
