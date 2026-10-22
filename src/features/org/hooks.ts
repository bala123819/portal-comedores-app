import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/store';
import { qk } from '@/features/query-keys';
import { orgApi, systemApi } from '@/services/api/endpoints';
import type { AddressBody } from '@/services/api/endpoints/org';
import { useAction } from '@/services/api/use-action';
import type { UpdateLogisticsBody, UpdateProfileBody } from './types';

export function useOrgProfile() {
  const setOrganization = useSession((s) => s.setOrganization);
  return useQuery({
    queryKey: qk.orgProfile,
    queryFn: async () => {
      const { organization } = await orgApi.profile();
      setOrganization(organization);
      return organization;
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
    successMessage: (data) =>
      data?.zone_assigned === false
        ? 'Guardamos la dirección. El Banco todavía no tiene una zona que cubra ese lugar.'
        : 'Guardamos la dirección',
    errorToast: false,
  });
}

/** `PUT /org/profile`: la respuesta trae el perfil completo, que reemplaza al de la caché. */
export function useUpdateProfile(onDone?: () => void) {
  const qc = useQueryClient();
  const setOrganization = useSession((s) => s.setOrganization);
  return useAction((body: UpdateProfileBody, key) => orgApi.updateProfile(body, key), {
    successMessage: 'Guardamos los datos de la organización',
    errorToast: false,
    onSuccess: ({ organization }) => {
      qc.setQueryData(qk.orgProfile, organization);
      setOrganization(organization);
      onDone?.();
    },
  });
}

export function useOrgLogistics() {
  return useQuery({ queryKey: qk.orgLogistics, queryFn: orgApi.logistics, meta: { persist: true } });
}

export function useUpdateLogistics(onDone?: () => void) {
  const qc = useQueryClient();
  return useAction((body: UpdateLogisticsBody, key) => orgApi.updateLogistics(body, key), {
    successMessage: 'Guardamos la capacidad logística',
    errorToast: false,
    onSuccess: (data) => {
      qc.setQueryData(qk.orgLogistics, data);
      onDone?.();
    },
  });
}
