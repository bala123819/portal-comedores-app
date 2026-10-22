import type { EligibleContact, Picker } from '@/features/asignaciones/types';
import { api } from '../client';
import type { BodyOf } from '../types';

export type DeclarePickerBody = BodyOf<'/api/assignments/{assignment_id}/pickers', 'post'>;

const id = (v: string) => encodeURIComponent(v);

/**
 * Quién retira una merma asignada (módulo `mermas`, apagado con la API real).
 * El padrón de contactos se migró a `/org/contacts` (orgApi.contacts, docs/bda/04-contactos.md):
 * autorizar a retirar lo hace el Banco, la app ya no llama a `/organizations/{id}/contacts*`.
 */
export const pickupApi = {
  eligibleContacts: (assignmentId: string) =>
    api.get<EligibleContact[]>(`/assignments/${id(assignmentId)}/eligible-contacts`),
  pickers: (assignmentId: string) => api.get<Picker[]>(`/assignments/${id(assignmentId)}/pickers`),
  declarePicker: (assignmentId: string, body: DeclarePickerBody, key: string) =>
    api.post<Picker>(`/assignments/${id(assignmentId)}/pickers`, body, key),
  removePicker: (pickerId: string, key: string) =>
    api.del<unknown>(`/pickers/${id(pickerId)}`, key),
};
