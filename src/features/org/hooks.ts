import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/store';
import { qk } from '@/features/query-keys';
import { orgApi, systemApi } from '@/services/api/endpoints';
import type { AddressBody } from '@/services/api/endpoints/org';
import { useAction } from '@/services/api/use-action';

export function useOrgProfile() {
  const setOrganization = useSession((s) => s.setOrganization);
  return useQuery({
    queryKey: qk.orgProfile,
    queryFn: async () => {
      const org = await orgApi.profile();
      setOrganization(org);
      return org;
    },
    meta: { persist: true },
  });
}

/** Id de la organización del usuario (del store o del perfil) */
export function useOrgId(): string | null {
  return useSession((s) => s.organization?.id ?? null);
}

export function useOrgStats() {
  return useQuery({ queryKey: qk.orgStats, queryFn: orgApi.stats, meta: { persist: true } });
}

export function useCapabilities() {
  return useQuery({ queryKey: qk.capabilities, queryFn: systemApi.capabilities, staleTime: 10 * 60_000 });
}

export function useUpdateAddress() {
  return useAction((body: AddressBody, key) => orgApi.updateAddress(body, key), {
    invalidate: [qk.orgProfile],
    successMessage: 'Guardamos la dirección',
    errorToast: false,
  });
}
