import { useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { organizationsApi } from '@/services/api/endpoints';

export function useRequirements(orgId: string | null) {
  return useQuery({
    queryKey: qk.requirements(orgId ?? ''),
    queryFn: () => organizationsApi.requirements(orgId!),
    enabled: !!orgId,
    retry: false,
  });
}

export function useDocuments(orgId: string | null) {
  return useQuery({
    queryKey: qk.documents(orgId ?? ''),
    queryFn: () => organizationsApi.documents(orgId!),
    enabled: !!orgId,
    retry: false,
  });
}

export function useSocialData(orgId: string | null) {
  return useQuery({
    queryKey: qk.socialData(orgId ?? ''),
    queryFn: () => organizationsApi.socialData(orgId!),
    enabled: !!orgId,
    retry: false,
  });
}
