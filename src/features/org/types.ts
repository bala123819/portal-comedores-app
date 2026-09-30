/** Campos de `POST/PUT /organizations` + estado del listado */
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
  latitude?: number | null;
  longitude?: number | null;
}

export interface Organization {
  id: string;
  name: string;
  legal_name?: string | null;
  tax_id?: string | null;
  organization_type?: string | null;
  status?: OrganizationStatus | string | null;
  address?: string | OrganizationAddress | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  service_count?: number | null;
  description?: string | null;
  total_beneficiaries?: number | null;
  declared_families?: number | null;
  has_refrigeration?: boolean | null;
  has_own_vehicle?: boolean | null;
  vehicle_capacity_kg?: number | null;
  pickup_preference?: string | null;
  preferred_pickup_days?: string[] | null;
  preferred_pickup_time_start?: string | null;
  preferred_pickup_time_end?: string | null;
  /** Cuota nutricional (`PUT /organizations/{id}/quota`) — si el perfil la expone */
  manual_quota?: number | null;
  nutritional_quota?: number | null;
}

/**
 * `GET /org/stats`: forma sin documentar. Se muestran los campos numéricos que vengan,
 * con etiquetas para los conocidos (ver `lib/labels.ts` → statLabels).
 */
export type OrgStats = Record<string, unknown>;

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
