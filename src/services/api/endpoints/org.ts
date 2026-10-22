import type { Assignment } from '@/features/asignaciones/types';
import type { ContactBody, OrganizationContact } from '@/features/contactos/types';
import type {
  CreateInteractionBody,
  Interaction,
  InteractionsFilter,
  InteractionsSummary,
} from '@/features/interacciones/types';
import type { AvailableMermasFilters, Merma } from '@/features/mermas/types';
import type {
  DocumentRequirement,
  OrganizationDocument,
  OrgLogistics,
  OrgProfileResponse,
  OrgStats,
  SocialData,
  UpdateAddressResponse,
  UpdateLogisticsBody,
  UpdateProfileBody,
} from '@/features/org/types';
import type {
  CatalogFilter,
  CatalogProduct,
  CreateDistributionBody,
  CreateDistributionResult,
  Distribution,
  DistributionsFilter,
  DistributionWarning,
  Quota,
} from '@/features/pedidos/types';
import type { Application } from '@/features/postulaciones/types';
import type {
  OrgNutrition,
  ReceivedFilter,
  ReceivedItem,
  ReceivedPage,
  ReceivedSummary,
} from '@/features/recibido/types';
import { api, isUuid, request } from '../client';
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
  /** Sólo los campos de `UpdateProfileBody`; el resto da 422 `FIELD_NOT_EDITABLE`. Devuelve `{ organization, user }`. */
  updateProfile: (body: UpdateProfileBody, key: string) =>
    api.put<OrgProfileResponse>('/org/profile', body, key),
  stats: () => api.get<OrgStats>('/org/stats'),
  updateAddress: (body: AddressBody, key: string) =>
    api.put<UpdateAddressResponse>('/org/address', body, key),

  // ─── Perfil de la organización (docs/bda/03-perfil-organizacion.md, post 3/14) ──
  socialData: () => api.get<SocialData>('/org/social-data'),
  logistics: () => api.get<OrgLogistics>('/org/logistics'),
  updateLogistics: (body: UpdateLogisticsBody, key: string) =>
    api.put<OrgLogistics>('/org/logistics', body, key),
  documents: () => api.get<OrganizationDocument[]>('/org/documents'),
  /** Se descarga con el Bearer (`downloadAndOpen`). Documento ajeno o inexistente: 404 `DOCUMENT_NOT_FOUND`. */
  documentDownloadPath: (documentId: string) => `/org/documents/${id(documentId)}/download`,
  requirements: () => api.get<DocumentRequirement[]>('/org/requirements'),

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

  // ─── Contactos: padrón de la organización (docs/bda/04-contactos.md) ───────
  /** Sin paginar. Trae `pickup_authorized` y `authorizations` (las da el Banco). */
  contacts: () => api.get<OrganizationContact[]>('/org/contacts'),
  /** 422 en `dni` si se repite dentro de la organización */
  createContact: (body: ContactBody, key: string) =>
    api.post<OrganizationContact>('/org/contacts', body, key),
  /** 409 `CONTACT_IDENTITY_LOCKED` si se cambia nombre o DNI de alguien autorizado por el Banco */
  updateContact: (contactId: string, body: ContactBody, key: string) =>
    api.put<OrganizationContact>(`/org/contacts/${id(contactId)}`, body, key),
  /** 409 `CONTACT_DECLARED_FOR_PICKUP` si está declarada para un retiro de merma en curso */
  deleteContact: (contactId: string, key: string) =>
    api.del<unknown>(`/org/contacts/${id(contactId)}`, key),

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

  // ─── Pedidos de mercadería (docs/bda/09-10-pedidos-mercaderia.md) ──────────
  catalog: (page: number, perPage: number, f: CatalogFilter = {}) =>
    api.getPage<CatalogProduct>('/org/catalog', {
      page,
      per_page: perPage,
      search: f.search?.trim() || undefined,
      food_category_id: f.food_category_id,
    }),
  quota: () => api.get<Quota>('/org/quota'),
  distributions: (page: number, perPage: number, status?: DistributionsFilter) =>
    api.getPage<Distribution>('/org/distributions', { page, per_page: perPage, status }),
  distribution: (distributionId: string) => {
    if (!isUuid(distributionId)) {
      return Promise.reject(new ApiError({ kind: 'not_found', status: 404 }));
    }
    return api.get<Distribution>(`/org/distributions/${id(distributionId)}`);
  },
  /** `warnings` (stock o cupo superados) y `quota` vienen fuera de `data`: se usa `request` directo. */
  createDistribution: async (body: CreateDistributionBody, key: string): Promise<CreateDistributionResult> => {
    const res = (await request<Distribution>('POST', '/org/distributions', { body, idempotencyKey: key })) as {
      data: Distribution;
      warnings?: DistributionWarning[];
      quota?: Quota;
    };
    return { distribution: res.data, warnings: res.warnings ?? [], quota: res.quota };
  },
  /** `reason` es obligatorio. Sólo mientras el banco no lo aprobó (si no, 409). */
  cancelDistribution: (distributionId: string, reason: string, key: string) =>
    api.post<Distribution>(`/org/distributions/${id(distributionId)}/cancel`, { reason }, key),
  /** Remito en PDF, desde `lista_para_retiro` (`receipt_available`). Se descarga con el Bearer. */
  receiptPath: (distributionId: string) => `/org/distributions/${id(distributionId)}/receipt`,

  // ─── Lo recibido y panel nutricional (docs/bda/11-recibido-nutricion.md) ────
  /** `data` trae `{ summary, items }` y la paginación viene en `meta`, afuera de `data`. */
  received: async (page: number, perPage: number, f: ReceivedFilter = {}): Promise<ReceivedPage> => {
    const res = await request<{ summary: ReceivedSummary; items: ReceivedItem[] }>('GET', '/org/received', {
      query: { page, per_page: perPage, from: f.from, to: f.to, kind: f.kind },
    });
    const items = res.data?.items ?? [];
    return {
      summary: res.data.summary,
      items,
      meta: res.meta ?? { current_page: page, last_page: page, per_page: perPage, total: items.length },
    };
  },
  /** Para este rol se usa `/org/nutrition`, no `/nutrition/summary` (mapa de la API del Banco, punto 3). */
  nutrition: (month?: string) => api.get<OrgNutrition>('/org/nutrition', { month }),
};
