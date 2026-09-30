import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { notificationsApi } from '@/services/api/endpoints';
import { useAction } from '@/services/api/use-action';

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: qk.notifications,
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
  });
}

/**
 * Contador de no leídas. Sin polling agresivo: se refresca al volver a la app (focus),
 * al reconectar, y como mucho cada 2 minutos mientras la app está abierta.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: qk.unreadCount,
    queryFn: async () => {
      const data = await notificationsApi.unreadCount();
      if (typeof data === 'number') return data;
      return data?.count ?? data?.unread_count ?? 0;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
}

const invalidate = [qk.notificationsAll];

export function useMarkRead() {
  return useAction((id: string, key) => notificationsApi.markRead(id, key), { invalidate });
}

export function useMarkAllRead() {
  return useAction((_: void, key) => notificationsApi.markAllRead(key), {
    invalidate,
    successMessage: 'Marcamos todas como leídas',
  });
}

export function useRemoveNotification() {
  return useAction((id: string, key) => notificationsApi.remove(id, key), { invalidate });
}

export function useRemoveAllNotifications() {
  return useAction((_: void, key) => notificationsApi.removeAll(key), {
    invalidate,
    successMessage: 'Borramos las notificaciones',
  });
}
