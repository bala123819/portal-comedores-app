import { api } from '../client';

const id = (v: string) => encodeURIComponent(v);

/**
 * Sub-recursos de `/organizations/{id}` (según permisos, G-02). Requerimientos, documentos y ficha
 * social pasaron a `/org/*` (post 3/14, `orgApi`): con el rol organización estas rutas dan 403.
 */
export const organizationsApi = {
  collectionCommitments: (orgId: string, year: number) =>
    api.get<Record<string, unknown>>(`/organizations/${id(orgId)}/collection-commitments`, {
      year,
    }),
};
