import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { nutritionApi, orgApi } from '@/services/api/endpoints';
import type { AvailableMermasFilters } from './types';

const PER_PAGE = 15;

export function useAvailableMermas(filters: AvailableMermasFilters = {}) {
  return useInfiniteQuery({
    queryKey: qk.mermas(filters),
    queryFn: ({ pageParam }) => orgApi.availableMermas(pageParam, PER_PAGE, filters),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    meta: { persist: true },
  });
}

export function useMerma(id: string) {
  return useQuery({
    queryKey: qk.merma(id),
    queryFn: () => orgApi.merma(id),
    enabled: !!id,
    meta: { persist: true },
  });
}

export function useMermaNutrition(id: string) {
  return useQuery({
    queryKey: qk.mermaNutrition(id),
    queryFn: () => nutritionApi.mermaSummary(id),
    enabled: !!id,
    staleTime: 10 * 60_000,
    // Si el rol no tiene acceso (403) no insistimos: la sección se oculta.
    retry: false,
  });
}
