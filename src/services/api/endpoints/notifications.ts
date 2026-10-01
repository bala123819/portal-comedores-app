import type { AppNotification } from '@/features/notificaciones/types';
import { api } from '../client';
import type { BodyOf } from '../types';

export type PushSubscribeBody = BodyOf<'/api/notifications/subscribe', 'post'>;

const id = (v: string) => encodeURIComponent(v);

export const notificationsApi = {
  list: (page: number, perPage: number, unread?: boolean) =>
    api.getPage<AppNotification>('/notifications', {
      page,
      per_page: perPage,
      unread: unread ? 'true' : undefined,
    }),
  unreadCount: async () => (await api.get<{ count: number }>('/notifications/unread-count')).count ?? 0,
  /** Crea un aviso de prueba en la propia bandeja */
  sendTest: (key: string) => api.post<{ message: string; notification: AppNotification }>('/notifications/test', {}, key),
  markRead: (notificationId: string, key: string) =>
    api.post<unknown>(`/notifications/${id(notificationId)}/read`, {}, key),
  markAllRead: (key: string) => api.post<unknown>('/notifications/read-all', {}, key),
  remove: (notificationId: string, key: string) =>
    api.del<unknown>(`/notifications/${id(notificationId)}`, key),
  removeAll: (key: string) => api.del<unknown>('/notifications', key),
  /** Solo Web Push (endpoint + keys). No acepta tokens de Expo (G-06). */
  subscribe: (body: PushSubscribeBody, key: string) =>
    api.post<unknown>('/notifications/subscribe', body, key),
  unsubscribe: (endpoint: string, key: string) =>
    api.post<unknown>('/notifications/unsubscribe', { endpoint }, key),
};
