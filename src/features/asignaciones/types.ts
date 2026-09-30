import type { Merma, MermaProduct } from '@/features/mermas/types';

export type AssignmentStatus =
  | 'asignada'
  | 'confirmada'
  | 'en_camino'
  | 'completada'
  | 'cancelada'
  | 'no_show';

/** Campos de approve / complete / products de asignaciones */
export interface AssignmentProduct {
  id: string;
  merma_product_id?: string;
  quantity_assigned: number;
  quantity_received?: number | null;
  merma_product?: MermaProduct | null;
  /** Algunos listados aplanan el producto */
  name?: string;
  unit?: string;
}

export interface Assignment {
  id: string;
  merma_id: string;
  application_id?: string | null;
  organization_id?: string;
  status: AssignmentStatus | string;
  scheduled_pickup_date?: string | null;
  scheduled_pickup_time_start?: string | null;
  scheduled_pickup_time_end?: string | null;
  products?: AssignmentProduct[];
  picked_up_by_name?: string | null;
  picked_up_by_dni?: string | null;
  completion_notes?: string | null;
  cancellation_reason?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  merma?: Merma | null;
}

/** Contacto de la organización (`GET /organizations/{id}/contacts`) */
export interface OrganizationContact {
  id: string;
  name: string;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  dni?: string | null;
  is_primary?: boolean;
}

/** `GET /assignments/{id}/eligible-contacts`: los que pueden retirar y por qué los otros no */
export interface EligibleContact {
  id?: string;
  organization_contact_id?: string;
  name: string;
  dni?: string | null;
  eligible?: boolean;
  reason?: string | null;
}

/** `GET /assignments/{id}/pickers` */
export interface Picker {
  id: string;
  organization_contact_id?: string | null;
  name?: string | null;
  dni?: string | null;
  declared_via?: 'web' | 'whatsapp' | string;
  /** Declarado fuera del padrón */
  is_unlisted?: boolean;
  contact?: OrganizationContact | null;
}

export type PickupScopeType = 'all' | 'donor' | 'donor_zone' | 'branch';

export interface PickupAuthorization {
  id: string;
  scope_type: PickupScopeType | string;
  scope_ref?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  created_via?: string | null;
  revoked_at?: string | null;
}
