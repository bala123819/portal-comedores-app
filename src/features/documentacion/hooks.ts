import { useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { orgApi } from '@/services/api/endpoints';

/** Portal de la organización (post 3/14): la organización la resuelve el backend por el usuario. */
export function useRequirements() {
  return useQuery({ queryKey: qk.requirements, queryFn: orgApi.requirements, meta: { persist: true } });
}

export function useDocuments() {
  return useQuery({ queryKey: qk.documents, queryFn: orgApi.documents, meta: { persist: true } });
}

export function useSocialData() {
  return useQuery({ queryKey: qk.socialData, queryFn: orgApi.socialData, meta: { persist: true } });
}
