import type { Family, FamilyMember, FamilyType } from '@/features/familias/types';
import type { DocumentRequirement, OrganizationDocument, SocialData } from '@/features/org/types';
import { api } from '../client';
import type { BodyOf } from '../types';

export type CreateFamilyBody = BodyOf<'/api/organizations/{organization_id}/families', 'post'>;
export type CreateMemberBody = BodyOf<
  '/api/organizations/{organization_id}/families/{family_id}/members',
  'post'
>;

const id = (v: string) => encodeURIComponent(v);

/** Sub-recursos de `/organizations/{id}` para la propia organización (según permisos, G-02) */
export const organizationsApi = {
  requirements: (orgId: string) =>
    api.get<DocumentRequirement[]>(`/organizations/${id(orgId)}/requirements`),
  documents: (orgId: string) =>
    api.get<OrganizationDocument[]>(`/organizations/${id(orgId)}/documents`),
  documentDownloadPath: (orgId: string, documentId: string) =>
    `/organizations/${id(orgId)}/documents/${id(documentId)}/download`,
  socialData: (orgId: string) => api.get<SocialData>(`/organizations/${id(orgId)}/social-data`),
  termsPdfPath: (orgId: string) => `/organizations/${id(orgId)}/terms-pdf`,
  collectionCommitments: (orgId: string, year: number) =>
    api.get<Record<string, unknown>>(`/organizations/${id(orgId)}/collection-commitments`, {
      year,
    }),

  familyTypes: () => api.get<FamilyType[]>('/family-types'),
  createFamily: (orgId: string, body: CreateFamilyBody, key: string) =>
    api.post<Family>(`/organizations/${id(orgId)}/families`, body, key),
  addMember: (orgId: string, familyId: string, body: CreateMemberBody, key: string) =>
    api.post<FamilyMember>(
      `/organizations/${id(orgId)}/families/${id(familyId)}/members`,
      body,
      key,
    ),
};
