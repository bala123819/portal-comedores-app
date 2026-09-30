import { useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { nutritionApi } from '@/services/api/endpoints';

export function useNutritionalGroups() {
  return useQuery({
    queryKey: qk.nutritionGroups,
    queryFn: nutritionApi.groups,
    staleTime: 24 * 60 * 60 * 1000,
    meta: { persist: true },
    retry: false,
  });
}

export function useNutritionSummary(from: string, to: string) {
  return useQuery({
    queryKey: qk.nutritionSummary(from, to),
    queryFn: () => nutritionApi.summary(from, to),
    staleTime: 10 * 60_000,
    retry: false,
  });
}

export function useProductSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: qk.productSearch(term),
    queryFn: () => nutritionApi.searchProducts(term),
    enabled: term.length >= 2,
    staleTime: 10 * 60_000,
    retry: false,
  });
}
