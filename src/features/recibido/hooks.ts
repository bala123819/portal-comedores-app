import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { orgApi } from '@/services/api/endpoints';
import type { ReceivedFilter, ReceivedPage } from './types';

const PER_PAGE = 20;

const nextPage = (last: ReceivedPage) =>
  last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined;

/** Lo recibido en un período. El `summary` (del período entero) sale de la primera página. */
export function useReceived(filter: ReceivedFilter = {}) {
  return useInfiniteQuery({
    queryKey: qk.received(filter),
    queryFn: ({ pageParam }) => orgApi.received(pageParam, PER_PAGE, filter),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    staleTime: 5 * 60_000,
    meta: { persist: true },
  });
}

/** Lo recibido por grupo nutricional contra la necesidad de cada grupo, para un mes (AAAA-MM). */
export function useOrgNutrition(month: string) {
  return useQuery({
    queryKey: qk.orgNutrition(month),
    queryFn: () => orgApi.nutrition(month),
    staleTime: 5 * 60_000,
    meta: { persist: true },
  });
}
