import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { organizationsApi, orgApi } from '@/services/api/endpoints';
import type { CreateFamilyBody } from '@/services/api/endpoints/organizations';
import { useAction } from '@/services/api/use-action';
import { features } from '@/lib/features';
import type { FamiliesFilter } from './types';

export function useFamilies(filter: FamiliesFilter = {}) {
  return useInfiniteQuery({
    queryKey: [...qk.families, filter],
    queryFn: ({ pageParam }) => orgApi.families(pageParam, 20, filter),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    meta: { persist: true },
  });
}

export function useFamily(id: string) {
  return useQuery({
    queryKey: qk.family(id),
    queryFn: () => orgApi.family(id),
    enabled: !!id,
    meta: { persist: true },
  });
}

export function useDemographics() {
  return useQuery({ queryKey: qk.demographics, queryFn: orgApi.demographics, meta: { persist: true } });
}

/** Sólo con el módulo `familiasAlta` (el alta no existe hoy en el backend) */
export function useFamilyTypes() {
  return useQuery({
    enabled: features.familiasAlta,
    queryKey: qk.familyTypes,
    queryFn: organizationsApi.familyTypes,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}

export function useCreateFamily(orgId: string, onSuccess?: (id: string) => void) {
  return useAction((body: CreateFamilyBody, key) => organizationsApi.createFamily(orgId, body, key), {
    invalidate: [qk.familiesAll],
    successMessage: 'Registramos la familia',
    onSuccess: (data) => onSuccess?.(data?.id),
    errorToast: false,
  });
}
