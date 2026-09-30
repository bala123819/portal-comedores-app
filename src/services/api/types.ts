import type { paths } from './schema';

/** Paginación según `llms.txt`: `meta = { current_page, last_page, per_page, total }` */
export interface Meta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** Envoltorio de toda respuesta de la API Mermab */
export interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: Meta;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface Page<T> {
  items: T[];
  meta: Meta;
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

// ─── Tipos derivados del OpenAPI (requests) ────────────────────────────────
// El spec no documenta respuestas (ver docs/api-gaps.md G-01), pero sí bodies y query params:
// los usamos para que cada request mande exactamente los campos que acepta el backend.

type ApiPaths = keyof paths;
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

type JsonBodyOf<Op> = Op extends {
  requestBody?: { content: { 'application/json': infer B } };
}
  ? B
  : never;

/** Body JSON aceptado por `M` en `P` (P con prefijo `/api`, como en el spec) */
export type BodyOf<P extends ApiPaths, M extends Method> = JsonBodyOf<NonNullable<paths[P][M]>>;

/** Query params aceptados por `M` en `P` */
export type QueryOf<P extends ApiPaths, M extends Method = 'get'> =
  NonNullable<paths[P][M]> extends { parameters: { query?: infer Q } } ? NonNullable<Q> : never;
