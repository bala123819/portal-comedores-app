import type { DocumentRequirement, OrganizationDocument, SocialData } from '@/features/org/types';
import { api } from '../client';

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
};
