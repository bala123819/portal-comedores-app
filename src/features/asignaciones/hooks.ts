import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { orgApi, pickupApi } from '@/services/api/endpoints';
import type { CompleteAssignmentBody } from '@/services/api/endpoints/org';
import type { AuthorizePickupBody, ContactBody, DeclarePickerBody } from '@/services/api/endpoints/pickup';
import { useAction } from '@/services/api/use-action';

const PER_PAGE = 15;

export function useAssignments(status?: string) {
  return useInfiniteQuery({
    queryKey: qk.assignments(status),
    queryFn: ({ pageParam }) => orgApi.assignments(pageParam, PER_PAGE, status),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    meta: { persist: true },
  });
}

export function useAssignment(id: string) {
  return useQuery({
    queryKey: qk.assignment(id),
    queryFn: () => orgApi.assignment(id),
    enabled: !!id,
    // Tiene máquina de estados: al abrir siempre se revalida (se muestra lo cacheado mientras)
    staleTime: 0,
    meta: { persist: true },
  });
}

const afterStateChange = [qk.assignmentsAll, qk.orgStats, qk.mermasAll];

export function useConfirmAssignment() {
  return useAction((id: string, key) => orgApi.confirmAssignment(id, key), {
    invalidate: afterStateChange,
    successMessage: 'Confirmaste el retiro. ¡Gracias!',
  });
}

export function useStartTransit() {
  return useAction((id: string, key) => orgApi.startTransit(id, key), {
    invalidate: afterStateChange,
    successMessage: 'Avisamos que van en camino',
  });
}

export function useCompleteAssignment(onSuccess?: () => void) {
  return useAction(
    ({ id, body }: { id: string; body: CompleteAssignmentBody }, key) =>
      orgApi.completeAssignment(id, body, key),
    {
      invalidate: [...afterStateChange, qk.applicationsAll],
      successMessage: '¡Retiro registrado! Gracias',
      onSuccess,
      errorToast: false,
    },
  );
}

export function useCancelAssignment(onSuccess?: () => void) {
  return useAction(
    ({ id, reason }: { id: string; reason?: string }, key) =>
      orgApi.cancelAssignment(id, { reason: reason || null }, key),
    {
      invalidate: afterStateChange,
      successMessage: 'Avisamos al Banco que no pueden ir',
      onSuccess,
    },
  );
}

// ─── Quién retira ──────────────────────────────────────────────────────────

export function usePickers(assignmentId: string) {
  return useQuery({
    queryKey: qk.pickers(assignmentId),
    queryFn: () => pickupApi.pickers(assignmentId),
    enabled: !!assignmentId,
    retry: false,
  });
}

export function useEligibleContacts(assignmentId: string) {
  return useQuery({
    queryKey: qk.eligibleContacts(assignmentId),
    queryFn: () => pickupApi.eligibleContacts(assignmentId),
    enabled: !!assignmentId,
    retry: false,
  });
}

export function useDeclarePicker(assignmentId: string, onSuccess?: () => void) {
  return useAction(
    (body: DeclarePickerBody, key) => pickupApi.declarePicker(assignmentId, body, key),
    {
      invalidate: [qk.pickers(assignmentId)],
      successMessage: 'Listo, avisamos quién va a retirar',
      onSuccess,
      errorToast: false,
    },
  );
}

export function useRemovePicker(assignmentId: string) {
  return useAction((pickerId: string, key) => pickupApi.removePicker(pickerId, key), {
    invalidate: [qk.pickers(assignmentId)],
    successMessage: 'Quitamos a esa persona',
  });
}

export function useContacts(orgId: string | null) {
  return useQuery({
    queryKey: qk.contacts(orgId ?? ''),
    queryFn: () => pickupApi.contacts(orgId!),
    enabled: !!orgId,
    retry: false,
  });
}

export function useCreateContact(orgId: string, onSuccess?: () => void) {
  return useAction((body: ContactBody, key) => pickupApi.createContact(orgId, body, key), {
    invalidate: [qk.contacts(orgId)],
    successMessage: 'Agregamos el contacto',
    onSuccess,
    errorToast: false,
  });
}

export function useAuthorizations(orgId: string | null, contactId: string) {
  return useQuery({
    queryKey: qk.authorizations(orgId ?? '', contactId),
    queryFn: () => pickupApi.authorizations(orgId!, contactId),
    enabled: !!orgId && !!contactId,
    retry: false,
  });
}

export function useAuthorizePickup(orgId: string, contactId: string) {
  return useAction((body: AuthorizePickupBody, key) => pickupApi.authorize(orgId, contactId, body, key), {
    invalidate: [qk.authorizations(orgId, contactId)],
    successMessage: 'La persona quedó autorizada para retirar',
  });
}

export function useRevokeAuthorization(orgId: string, contactId: string) {
  return useAction((authorizationId: string, key) => pickupApi.revokeAuthorization(authorizationId, key), {
    invalidate: [qk.authorizations(orgId, contactId)],
    successMessage: 'Quitamos la autorización',
  });
}
