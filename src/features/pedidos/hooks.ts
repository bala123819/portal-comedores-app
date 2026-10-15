import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { flattenPages } from '@/components/ui/Query';
import { qk } from '@/features/query-keys';
import { orgApi } from '@/services/api/endpoints';
import { useAction } from '@/services/api/use-action';
import type {
  CatalogFilter,
  CreateDistributionBody,
  CreateDistributionResult,
  DistributionsFilter,
} from './types';
import { ORDER_RULES } from './types';

const PER_PAGE = 20;

const nextPage = (last: { meta: { current_page: number; last_page: number } }) =>
  last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined;

export function useCatalog(filter: CatalogFilter = {}) {
  return useInfiniteQuery({
    queryKey: qk.catalog(filter),
    queryFn: ({ pageParam }) => orgApi.catalog(pageParam, 50, filter),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    // La disponibilidad cambia con el stock del banco: se revalida al volver a la pantalla
    staleTime: 60_000,
    meta: { persist: true },
  });
}

export function useQuota() {
  return useQuery({ queryKey: qk.quota, queryFn: orgApi.quota, meta: { persist: true } });
}

export function useDistributions(status?: DistributionsFilter) {
  return useInfiniteQuery({
    queryKey: qk.distributions(status),
    queryFn: ({ pageParam }) => orgApi.distributions(pageParam, PER_PAGE, status),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    meta: { persist: true },
  });
}

export function useDistribution(id: string) {
  return useQuery({
    queryKey: qk.distribution(id),
    queryFn: () => orgApi.distribution(id),
    enabled: !!id,
    // Tiene máquina de estados: al abrir siempre se revalida (se muestra lo cacheado mientras)
    staleTime: 0,
    meta: { persist: true },
  });
}

/**
 * Pedidos esperando respuesta del banco (`pendiente` o `en_revision`). Hay un máximo de 3:
 * se avisa antes de armar el pedido en vez de esperar el 422 `TOO_MANY_OPEN_REQUESTS`.
 */
export function useWaitingRequests() {
  const q = useDistributions('abiertos');
  const waiting = flattenPages(q.data).filter(
    (d) => d.status === 'pendiente' || d.status === 'en_revision',
  );
  return {
    query: q,
    count: waiting.length,
    limitReached: waiting.length >= ORDER_RULES.maxOpenRequests,
  };
}

export function useCreateDistribution(onSuccess?: (result: CreateDistributionResult) => void) {
  return useAction((body: CreateDistributionBody, key) => orgApi.createDistribution(body, key), {
    invalidate: [qk.distributionsAll, qk.quota, qk.orgStats],
    successMessage: '¡Listo! Enviamos tu pedido al Banco',
    onSuccess: (data) => onSuccess?.(data),
    errorToast: false,
  });
}

export function useCancelDistribution() {
  return useAction(
    ({ id, reason }: { id: string; reason: string }, key) =>
      orgApi.cancelDistribution(id, reason, key),
    {
      invalidate: [qk.distributionsAll, qk.quota],
      successMessage: 'Cancelaste el pedido',
      errorToast: false,
    },
  );
}
