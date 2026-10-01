/**
 * Tipos de la organización según las respuestas REALES de `GET /org/profile`
 * (docs/bda/02-sesion-perfil-organizacion.md).
 */
export type OrganizationStatus = 'pendiente' | 'verificada' | 'aprobada' | 'suspendida' | 'inactiva';

export interface OrganizationAddress {
  street?: string | null;
  street_number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  full_address?: string | null;
  /** En `/org/profile` vienen como número o null; en la respuesta de `PUT /org/address`, como string */
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface Organization {
  id: string;
  name: string;
  legal_name?: string | null;
  tax_id?: string | null;
  organization_type?: string | null;
  email?: string | null;
  phone?: string | null;
  /** Se recalcula solo a partir de las familias cargadas */
  total_beneficiaries?: number | null;
  services_per_day?: number | null;
  /** Cuota mensual en kg; se recalcula sola a partir de las familias */
  monthly_quota_kg?: number | null;
  status?: OrganizationStatus | string | null;
  pickup_preference?: string | null;
  preferred_pickup_days?: string[] | null;
  preferred_pickup_time_start?: string | null;
  preferred_pickup_time_end?: string | null;
  has_refrigeration?: boolean | null;
  has_own_vehicle?: boolean | null;
  vehicle_capacity_kg?: number | null;
  compliance_score?: number | null;
  geographic_zone?: { id?: string; name?: string } | string | null;
  address?: OrganizationAddress | null;
}

/** `GET /org/profile` → `{ organization, user }` */
export interface OrgProfileResponse {
  organization: Organization;
  user?: { id: string; full_name?: string; email?: string };
}

/** `GET /org/stats`. Hoy sólo `impacto` es útil; el resto cuenta mermas (viene en cero). */
export interface OrgStats {
  postulaciones?: { total: number; pendientes: number; aprobadas: number; rechazadas: number };
  asignaciones?: { total: number; pendientes: number; completadas: number; canceladas: number; este_mes: number };
  impacto?: { total_kg_recibidos: number; total_distribuciones: number };
  disponibilidad?: { mermas_disponibles: number };
}

/** Respuesta de `PUT /org/address` */
export interface UpdateAddressResponse {
  address: OrganizationAddress;
  geographic_zone: unknown;
  zone_assigned: boolean;
}

export interface SocialData {
  organization_fields?: {
    fantasy_name?: string | null;
    founding_year?: number | null;
    has_legal_status?: boolean | null;
    legal_status_type?: string | null;
    delivers_viandas?: boolean | null;
    generates_own_income?: boolean | null;
    income_methods?: string[] | null;
    water_source?: string | null;
    has_bathroom?: boolean | null;
    cooking_sources?: string[] | null;
    property_ownership?: string | null;
    storage_methods?: string[] | null;
  } | null;
  fiscal_address?: OrganizationAddress | null;
  services?: unknown[] | null;
  meal_schedule?: unknown[] | null;
  funding_sources?: unknown[] | null;
  kitchen_equipment?: unknown[] | null;
}

export interface DocumentRequirement {
  id?: string;
  document_type: string;
  label: string;
  is_required?: boolean;
  has_expiration?: boolean;
  notes?: string | null;
  /** Estado resuelto (ej. presentado / faltante / vencido) — sin enum documentado */
  status?: string | null;
  document?: OrganizationDocument | null;
}

export interface OrganizationDocument {
  id: string;
  document_type: string;
  document_name?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
}
