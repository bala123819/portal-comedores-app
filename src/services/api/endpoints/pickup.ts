import type {
  EligibleContact,
  OrganizationContact,
  Picker,
  PickupAuthorization,
} from '@/features/asignaciones/types';
import { api } from '../client';
import type { BodyOf } from '../types';

export type DeclarePickerBody = BodyOf<'/api/assignments/{assignment_id}/pickers', 'post'>;
export type AuthorizePickupBody = BodyOf<
  '/api/organizations/{organization_id}/contacts/{contact_id}/pickup-authorizations',
  'post'
>;
export type ContactBody = BodyOf<'/api/organizations/{organization_id}/contacts', 'post'>;

const id = (v: string) => encodeURIComponent(v);

/** Quién retira: padrón de contactos, autorizaciones y declaraciones por asignación */
export const pickupApi = {
  eligibleContacts: (assignmentId: string) =>
    api.get<EligibleContact[]>(`/assignments/${id(assignmentId)}/eligible-contacts`),
  pickers: (assignmentId: string) => api.get<Picker[]>(`/assignments/${id(assignmentId)}/pickers`),
  declarePicker: (assignmentId: string, body: DeclarePickerBody, key: string) =>
    api.post<Picker>(`/assignments/${id(assignmentId)}/pickers`, body, key),
  removePicker: (pickerId: string, key: string) =>
    api.del<unknown>(`/pickers/${id(pickerId)}`, key),

  contacts: (orgId: string) =>
    api.get<OrganizationContact[]>(`/organizations/${id(orgId)}/contacts`),
  createContact: (orgId: string, body: ContactBody, key: string) =>
    api.post<OrganizationContact>(`/organizations/${id(orgId)}/contacts`, body, key),
  authorizations: (orgId: string, contactId: string) =>
    api.get<PickupAuthorization[]>(
      `/organizations/${id(orgId)}/contacts/${id(contactId)}/pickup-authorizations`,
    ),
  authorize: (orgId: string, contactId: string, body: AuthorizePickupBody, key: string) =>
    api.post<PickupAuthorization>(
      `/organizations/${id(orgId)}/contacts/${id(contactId)}/pickup-authorizations`,
      body,
      key,
    ),
  revokeAuthorization: (authorizationId: string, key: string) =>
    api.del<unknown>(`/pickup-authorizations/${id(authorizationId)}`, key),
};
