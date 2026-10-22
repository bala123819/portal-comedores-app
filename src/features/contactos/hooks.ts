import { useQuery } from '@tanstack/react-query';
import { qk } from '@/features/query-keys';
import { orgApi } from '@/services/api/endpoints';
import { useAction } from '@/services/api/use-action';
import type { ContactBody } from './types';

/** Padrón de la organización. La lista no viene paginada. */
export function useContacts(enabled = true) {
  return useQuery({
    queryKey: qk.contacts,
    queryFn: orgApi.contacts,
    enabled,
    meta: { persist: true },
  });
}

/** No hay `GET /org/contacts/{id}`: el contacto sale de la lista */
export function useContact(id: string) {
  const q = useContacts(!!id);
  return { ...q, contact: q.data?.find((c) => c.id === id) };
}

export function useCreateContact(onSuccess?: () => void) {
  return useAction((body: ContactBody, key) => orgApi.createContact(body, key), {
    invalidate: [qk.contacts],
    successMessage: 'Agregamos el contacto',
    onSuccess,
    // Los 422 van al campo; el resto lo muestra la pantalla
    errorToast: false,
  });
}

export function useUpdateContact(id: string, onSuccess?: () => void) {
  return useAction((body: ContactBody, key) => orgApi.updateContact(id, body, key), {
    invalidate: [qk.contacts],
    successMessage: 'Guardamos los cambios',
    onSuccess,
    errorToast: false,
  });
}

export function useDeleteContact(id: string, onSuccess?: () => void) {
  return useAction((_: void, key) => orgApi.deleteContact(id, key), {
    invalidate: [qk.contacts],
    successMessage: 'Dimos de baja el contacto',
    onSuccess,
    errorToast: false,
  });
}
