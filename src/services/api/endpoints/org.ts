import type { Assignment } from '@/features/asignaciones/types';
import type { Demographics, Family } from '@/features/familias/types';
import type { AvailableMermasFilters, Merma } from '@/features/mermas/types';
import type { Organization, OrgStats } from '@/features/org/types';
import type { Application } from '@/features/postulaciones/types';
import { api } from '../client';
import type { BodyOf } from '../types';

export type CreateApplicationBody = BodyOf<'/api/org/applications', 'post'>;
export type CompleteAssignmentBody = BodyOf<'/api/org/assignments/{assignment}/complete', 'post'>;
export type CancelAssignmentBody = BodyOf<'/api/org/assignments/{assignment}/cancel', 'post'>;
export type AddressBody = BodyOf<'/api/org/address', 'put'>;

const id = (v: string) => encodeURIComponent(v);

/** Portal Organización: el tenant y la organización los resuelve el backend por el usuario. */
export const orgApi = {
  profile: () => api.get<Organization>('/org/profile'),
  stats: () => api.get<OrgStats>('/org/stats'),
  updateAddress: (body: AddressBody, key: string) => api.put<unknown>('/org/address', body, key),

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

  families: (page: number, perPage: number) =>
    api.getPage<Family>('/org/families', { page, per_page: perPage }),
  demographics: () => api.get<Demographics>('/org/families/demographics'),
  family: (familyId: string) => api.get<Family>(`/org/families/${id(familyId)}`),
};
