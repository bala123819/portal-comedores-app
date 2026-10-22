/**
 * Tipos de la organización según las respuestas REALES del portal (`/org/profile`, `/org/logistics`,
 * `/org/social-data`, `/org/documents`, `/org/requirements`): docs/bda/03-perfil-organizacion.md (post 3/14).
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

export interface GeographicZone {
  id?: string;
  code?: string | null;
  name?: string;
  max_radius_km?: number | null;
  is_active?: boolean;
  assigned_at?: string | null;
  assignment_method?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  legal_name?: string | null;
  tax_id?: string | null;
  organization_type?: string | null;
  email?: string | null;
  phone?: string | null;
  description?: string | null;
  /** Se recalcula solo a partir de las familias cargadas */
  total_beneficiaries?: number | null;
  services_per_day?: number | null;
  /** Cuota mensual en kg; se recalcula sola a partir de las familias */
  monthly_quota_kg?: number | null;
  status?: OrganizationStatus | string | null;
  pickup_preference?: PickupPreference | string | null;
  /** En minúscula y sin tilde: lunes … sabado */
  preferred_pickup_days?: string[] | null;
  /** Con segundos: "09:00:00" */
  preferred_pickup_time_start?: string | null;
  preferred_pickup_time_end?: string | null;
  has_refrigeration?: boolean | null;
  has_own_vehicle?: boolean | null;
  /** Llega como texto ("300.00") */
  vehicle_capacity_kg?: number | string | null;
  compliance_score?: number | null;
  geographic_zone?: GeographicZone | string | null;
  additional_zones?: GeographicZone[] | null;
  address?: OrganizationAddress | null;
}

export type PickupPreference = 'pickup' | 'delivery';

/** Días que acepta `PUT /org/profile` (minúscula y sin tilde; no hay domingo) */
export const PICKUP_DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const;
export type PickupDay = (typeof PICKUP_DAYS)[number];

/**
 * `PUT /org/profile` (post 3/14). Sólo estos campos: cualquier otro responde
 * 422 `FIELD_NOT_EDITABLE` (lo cambia el Banco). Horas en "HH:MM".
 */
export interface UpdateProfileBody {
  email?: string | null;
  phone?: string | null;
  description?: string | null;
  pickup_preference?: PickupPreference;
  preferred_pickup_days?: PickupDay[];
  preferred_pickup_time_start?: string | null;
  preferred_pickup_time_end?: string | null;
  has_refrigeration?: boolean;
  vehicle_capacity_kg?: number | null;
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

/** `GET /org/social-data`: ficha social que relevó el Banco. Sólo lectura. */
export interface SocialData {
  organization_id?: string;
  fields?: {
    fantasy_name?: string | null;
    interviewed_by?: string | null;
    founding_year?: number | null;
    has_legal_status?: boolean | null;
    legal_status_type?: string | null;
    delivers_viandas?: boolean | null;
    viandas_notes?: string | null;
    generates_own_income?: boolean | null;
    income_methods?: string[] | null;
    water_source?: string | null;
    has_bathroom?: boolean | null;
    cooking_sources?: string[] | null;
    property_ownership?: string | null;
    storage_methods?: string[] | null;
    /** Fecha en que aceptaron la carta compromiso */
    terms_accepted_at?: string | null;
    terms_accepted_by?: string | null;
  } | null;
  fiscal_address?: OrganizationAddress | null;
  /** Sin ejemplos con datos en la guía: forma desconocida */
  services?: unknown[] | null;
  meal_schedule?: unknown[] | null;
  funding_sources?: unknown[] | null;
  kitchen_equipment?: unknown[] | null;
}

export type ColdCapacityType = 'camara_frigorifica' | 'freezer' | 'heladera' | 'ninguna';
export type TransportVehicleType = 'camion' | 'camioneta' | 'moto' | 'otro';

/** `GET /org/logistics`: capacidad logística (frío, transporte, contacto operativo) */
export interface OrgLogistics {
  id?: string;
  organization_id?: string;
  cold_capacity_m3?: number | string | null;
  cold_capacity_type?: ColdCapacityType | null;
  own_transport_capable?: boolean | null;
  transport_vehicle_type?: TransportVehicleType | null;
  transport_notes?: string | null;
  operational_contact_name?: string | null;
  operational_contact_phone?: string | null;
  operational_contact_email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** `PUT /org/logistics` */
export type UpdateLogisticsBody = Partial<
  Omit<OrgLogistics, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'cold_capacity_m3'>
> & { cold_capacity_m3?: number | null };

/** `GET /org/requirements`. `status` visto en el servidor: `missing` (sin enum documentado). */
export interface DocumentRequirement {
  id?: string;
  document_type: string;
  label: string;
  is_required?: boolean;
  has_expiration?: boolean;
  notes?: string | null;
  sort_order?: number | null;
  /** `global` (todas las organizaciones) o `type` (según el tipo de organización) */
  scope?: string | null;
  status?: string | null;
  document?: OrganizationDocument | null;
}

/** `GET /org/documents` */
export interface OrganizationDocument {
  id: string;
  document_type: string;
  document_name?: string | null;
  mime_type?: string | null;
  /** En bytes */
  file_size?: number | null;
  expires_at?: string | null;
  is_expired?: boolean | null;
  is_verified?: boolean | null;
  created_at?: string | null;
  /** Con el prefijo `/api` ("/api/org/documents/{id}/download") */
  download_path?: string | null;
}
