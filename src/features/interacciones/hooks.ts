import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { orgApi } from '@/services/api/endpoints';
import { useAction } from '@/services/api/use-action';
import type { CreateInteractionBody, Interaction, InteractionsFilter } from './types';

export function useInteractions(filter: InteractionsFilter = {}) {
  return useInfiniteQuery({
    queryKey: qk.interactions(filter),
    queryFn: ({ pageParam }) => orgApi.interactions(pageParam, 20, filter),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    meta: { persist: true },
  });
}

export function useInteraction(id: string) {
  return useQuery({
    queryKey: qk.interaction(id),
    queryFn: () => orgApi.interaction(id),
    enabled: !!id,
    meta: { persist: true },
  });
}

/** Cantidades por tipo y estado: para los contadores y el aviso del inicio */
export function useInteractionsSummary() {
  return useQuery({
    queryKey: qk.interactionsSummary,
    queryFn: orgApi.interactionsSummary,
    staleTime: 60_000,
    meta: { persist: true },
  });
}

export function useCreateInteraction(onSuccess?: (created: Interaction) => void) {
  return useAction((body: CreateInteractionBody, key) => orgApi.createInteraction(body, key), {
    invalidate: [qk.interactionsAll],
    successMessage: 'Le enviamos tu mensaje al Banco',
    onSuccess: (data) => onSuccess?.(data),
    // Los 422 se muestran en el campo; el resto lo muestra la pantalla
    errorToast: false,
  });
}
