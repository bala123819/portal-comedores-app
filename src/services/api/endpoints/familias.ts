import type {
  CreateFamilyInput,
  Demographics,
  FamiliesFilter,
  Family,
  FamilyFormConfig,
  FamilyMember,
  FamilyType,
  MemberInput,
  MemberSearchResult,
  UpdateFamilyInput,
  UpdateMemberInput,
} from '@/features/familias/types';
import { api, isUuid } from '../client';
import { ApiError } from '../errors';

const id = (v: string) => encodeURIComponent(v);

/** Un id no UUID da 500 en el servidor: se corta antes como "no encontrado". */
const guard = (...ids: string[]) =>
  ids.every(isUuid) ? null : Promise.reject(new ApiError({ kind: 'not_found', status: 404 }));

/** Familias y miembros de la organización (`/org/families*`, posts 5–7 de la API en GoDubi). */
export const familiasApi = {
  list: (page: number, perPage: number, f: FamiliesFilter = {}) =>
    api.getPage<Family>('/org/families', {
      page,
      per_page: perPage,
      search: f.search?.trim() || undefined,
      status: f.status,
      source: f.source,
    }),
  demographics: () => api.get<Demographics>('/org/families/demographics'),
  get: (familyId: string) => guard(familyId) ?? api.get<Family>(`/org/families/${id(familyId)}`),

  types: () => api.get<FamilyType[]>('/org/family-types'),
  formConfig: () => api.get<FamilyFormConfig>('/org/families/form-config'),

  create: (body: CreateFamilyInput, key: string) => api.post<Family>('/org/families', body, key),
  update: (familyId: string, body: UpdateFamilyInput, key: string) =>
    guard(familyId) ?? api.put<Family>(`/org/families/${id(familyId)}`, body, key),
  remove: (familyId: string, key: string) =>
    guard(familyId) ?? api.del<unknown>(`/org/families/${id(familyId)}`, key),

  addMember: (familyId: string, body: MemberInput, key: string) =>
    guard(familyId) ?? api.post<FamilyMember>(`/org/families/${id(familyId)}/members`, body, key),
  updateMember: (familyId: string, memberId: string, body: UpdateMemberInput, key: string) =>
    guard(familyId, memberId) ??
    api.put<FamilyMember>(`/org/families/${id(familyId)}/members/${id(memberId)}`, body, key),
  removeMember: (familyId: string, memberId: string, key: string) =>
    guard(familyId, memberId) ??
    api.del<unknown>(`/org/families/${id(familyId)}/members/${id(memberId)}`, key),

  searchMember: (documentNumber: string) =>
    api.get<MemberSearchResult>('/org/families/members/search', {
      document_number: documentNumber.trim(),
    }),
};
