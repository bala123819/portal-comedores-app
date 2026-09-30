import { useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { organizationsApi, programsApi } from '@/services/api/endpoints';
import { useAction } from '@/services/api/use-action';

export function useCollectionSessions(orgId: string | null) {
  return useQuery({
    queryKey: qk.sessions,
    queryFn: async () => {
      const page = await programsApi.sessions();
      // El endpoint no filtra por organización (G-09): nos quedamos con las nuestras.
      return page.items.filter((s) => !s.organization_id || s.organization_id === orgId);
    },
    retry: false,
  });
}

export function useConfirmSession() {
  return useAction((id: string, key) => programsApi.confirmSession(id, key), {
    invalidate: [qk.sessions],
    successMessage: 'Confirmamos tu asistencia a la jornada',
  });
}

export function usePrograms() {
  return useQuery({
    queryKey: qk.programs,
    queryFn: async () => (await programsApi.programs()).items,
    retry: false,
  });
}

export function useTrainings(programId: string | null) {
  return useQuery({
    queryKey: qk.trainings(programId ?? ''),
    queryFn: async () => (await programsApi.trainings(programId!)).items,
    enabled: !!programId,
    retry: false,
  });
}

export function useCollectionCommitments(orgId: string | null, year: number) {
  return useQuery({
    queryKey: qk.commitments(orgId ?? '', year),
    queryFn: () => organizationsApi.collectionCommitments(orgId!, year),
    enabled: !!orgId,
    retry: false,
  });
}
