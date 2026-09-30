import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { orgApi } from '@/services/api/endpoints';
import type { CreateApplicationBody } from '@/services/api/endpoints/org';
import { useAction } from '@/services/api/use-action';

const PER_PAGE = 15;

export function useApplications(status?: string) {
  return useInfiniteQuery({
    queryKey: qk.applications(status),
    queryFn: ({ pageParam }) => orgApi.applications(pageParam, PER_PAGE, status),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    meta: { persist: true },
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: qk.application(id),
    queryFn: () => orgApi.application(id),
    enabled: !!id,
    // Tiene máquina de estados: al abrir siempre se revalida (se muestra lo cacheado mientras)
    staleTime: 0,
    meta: { persist: true },
  });
}

export function useCreateApplication(onSuccess?: (id: string) => void) {
  return useAction((body: CreateApplicationBody, key) => orgApi.createApplication(body, key), {
    invalidate: [qk.applicationsAll, qk.mermasAll, qk.orgStats, qk.notificationsAll],
    successMessage: '¡Listo! Enviamos tu pedido al Banco',
    onSuccess: (data) => onSuccess?.(data?.id),
    errorToast: false,
  });
}

export function useCancelApplication() {
  return useAction((id: string, key) => orgApi.cancelApplication(id, key), {
    invalidate: [qk.applicationsAll, qk.mermasAll, qk.orgStats],
    successMessage: 'Cancelaste el pedido',
  });
}
