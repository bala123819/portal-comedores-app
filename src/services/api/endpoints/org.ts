import type { Assignment } from '@/features/asignaciones/types';
import type {
  CreateInteractionBody,
  Interaction,
  InteractionsFilter,
  InteractionsSummary,
} from '@/features/interacciones/types';
import type { AvailableMermasFilters, Merma } from '@/features/mermas/types';
import type { OrgProfileResponse, OrgStats, UpdateAddressResponse } from '@/features/org/types';
import type { Application } from '@/features/postulaciones/types';
import { api, isUuid } from '../client';
import { ApiError } from '../errors';
import type { BodyOf } from '../types';

export type CreateApplicationBody = BodyOf<'/api/org/applications', 'post'>;
export type CompleteAssignmentBody = BodyOf<'/api/org/assignments/{assignment}/complete', 'post'>;
export type CancelAssignmentBody = BodyOf<'/api/org/assignments/{assignment}/cancel', 'post'>;
export type AddressBody = BodyOf<'/api/org/address', 'put'>;

const id = (v: string) => encodeURIComponent(v);

/** Portal Organización: el tenant y la organización los resuelve el backend por el usuario. */
export const orgApi = {
  /** Devuelve `{ organization, user }` */
  profile: () => api.get<OrgProfileResponse>('/org/profile'),
  stats: () => api.get<OrgStats>('/org/stats'),
  updateAddress: (body: AddressBody, key: string) =>
    api.put<UpdateAddressResponse>('/org/address', body, key),

  availableMermas: (page: number, perPage: number, f: AvailableMermasFilters = {}) =>
    api.getPage<Merma>('/org/mermas/available', {
      page,
      per_page: perPage,
      urgent: f.urgent ? 'true' : undefined,
      priority: f.priority,
      max_distance: f.max_distance,
    }),
  merma: (mermaId: string) => api.get<Merma>(`/org/mermas/${id(mermaId)}`),

  applications: (page: number, perPage: number, status?: string) =>
    api.getPage<Application>('/org/applications', { page, per_page: perPage, status }),
  application: (applicationId: string) =>
    api.get<Application>(`/org/applications/${id(applicationId)}`),
  createApplication: (body: CreateApplicationBody, key: string) =>
    api.post<Application>('/org/applications', body, key),
  /** Cancelar postulación = DELETE (el portal no tiene /cancel) */
  cancelApplication: (applicationId: string, key: string) =>
    api.del<unknown>(`/org/applications/${id(applicationId)}`, key),

  assignments: (page: number, perPage: number, status?: string) =>
    api.getPage<Assignment>('/org/assignments', { page, per_page: perPage, status }),
  assignment: (assignmentId: string) =>
    api.get<Assignment>(`/org/assignments/${id(assignmentId)}`),
  confirmAssignment: (assignmentId: string, key: string) =>
    api.post<Assignment>(`/org/assignments/${id(assignmentId)}/confirm`, {}, key),
  startTransit: (assignmentId: string, key: string) =>
    api.post<Assignment>(`/org/assignments/${id(assignmentId)}/start-transit`, {}, key),
  completeAssignment: (assignmentId: string, body: CompleteAssignmentBody, key: string) =>
    api.post<Assignment>(`/org/assignments/${id(assignmentId)}/complete`, body, key),
  cancelAssignment: (assignmentId: string, body: CancelAssignmentBody, key: string) =>
    api.post<Assignment>(`/org/assignments/${id(assignmentId)}/cancel`, body, key),

  /** Comunicación con el Banco (docs/bda/08-interacciones.md) */
  interactions: (page: number, perPage: number, f: InteractionsFilter = {}) =>
    api.getPage<Interaction>('/org/interactions', {
      page,
      per_page: perPage,
      type: f.type,
      status: f.status,
    }),
  interactionsSummary: () => api.get<InteractionsSummary>('/org/interactions/summary'),
  interaction: (interactionId: string) => {
    if (!isUuid(interactionId)) {
      return Promise.reject(new ApiError({ kind: 'not_found', status: 404 }));
    }
    return api.get<Interaction>(`/org/interactions/${id(interactionId)}`);
  },
  createInteraction: (body: CreateInteractionBody, key: string) =>
    api.post<Interaction>('/org/interactions', body, key),
};
