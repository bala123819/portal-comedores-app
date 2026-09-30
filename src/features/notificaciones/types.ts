/**
 * `GET /notifications`: forma sin documentar. Se contemplan las dos formas habituales en Laravel
 * (notificación propia con title/message, o DatabaseNotification con `data` y `read_at`).
 */
export interface AppNotification {
  id: string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
}

export function notificationTitle(n: AppNotification): string {
  const d = n.data ?? {};
  return (n.title ?? (d.title as string | undefined) ?? '').toString();
}

export function notificationBody(n: AppNotification): string {
  const d = n.data ?? {};
  return (n.message ?? n.body ?? (d.message as string | undefined) ?? (d.body as string | undefined) ?? '').toString();
}

export function isUnread(n: AppNotification): boolean {
  if (typeof n.is_read === 'boolean') return !n.is_read;
  return !n.read_at;
}

/** Id de entidad relacionada, para navegar desde la notificación */
export function notificationTarget(
  n: AppNotification,
): { kind: 'merma' | 'assignment' | 'application'; id: string } | null {
  const d = n.data ?? {};
  if (typeof d.assignment_id === 'string') return { kind: 'assignment', id: d.assignment_id };
  if (typeof d.application_id === 'string') return { kind: 'application', id: d.application_id };
  if (typeof d.merma_id === 'string') return { kind: 'merma', id: d.merma_id };
  return null;
}
