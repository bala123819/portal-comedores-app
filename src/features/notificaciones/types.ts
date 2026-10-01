/** Aviso según la respuesta REAL de `/notifications` (docs/bda/03-familias-avisos.md). */
export interface AppNotification {
  id: string;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
  /** Ruta del panel web del Banco (p. ej. "/notifications"); no se usa para navegar en la app */
  action_url?: string | null;
  icon?: string | null;
  is_read?: boolean | null;
  read_at?: string | null;
  created_at?: string | null;
}

export function notificationTitle(n: AppNotification): string {
  return (n.title ?? '').toString();
}

export function notificationBody(n: AppNotification): string {
  return (n.body ?? '').toString();
}

export function isUnread(n: AppNotification): boolean {
  if (typeof n.is_read === 'boolean') return !n.is_read;
  return !n.read_at;
}

/** Entidad relacionada (si el aviso trae ids en `data`), para navegar desde el aviso */
export function notificationTarget(
  n: AppNotification,
): { kind: 'merma' | 'assignment' | 'application' | 'family'; id: string } | null {
  const d = n.data ?? {};
  if (typeof d.assignment_id === 'string') return { kind: 'assignment', id: d.assignment_id };
  if (typeof d.application_id === 'string') return { kind: 'application', id: d.application_id };
  if (typeof d.merma_id === 'string') return { kind: 'merma', id: d.merma_id };
  if (typeof d.family_id === 'string') return { kind: 'family', id: d.family_id };
  return null;
}
