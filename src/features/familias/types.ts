/** Tipos según las respuestas REALES de `/org/families*` (docs/bda/03-familias-avisos.md). */
export type FamilyStatus = 'activa' | 'inactiva' | 'suspendida';
export type FamilySource = 'manual' | 'program_enrollment' | 'all';

export type AgeGroup = 'infants_0_2' | 'children_3_12' | 'teens_13_17' | 'adults_18_64' | 'seniors_65_plus';

export interface FamilyMember {
  id: string;
  family_id?: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  document_number?: string | null;
  document_type?: 'dni' | 'pasaporte' | 'otro' | string | null;
  birth_date?: string | null;
  age?: number | null;
  age_group?: AgeGroup | string | null;
  gender?: string | null;
  relationship?: string | null;
  is_head_of_household?: boolean | null;
  phone?: string | null;
  email?: string | null;
  is_pregnant?: boolean | null;
  is_nursing_mother?: boolean | null;
  is_diabetic?: boolean | null;
  is_celiac?: boolean | null;
  is_lactose_intolerant?: boolean | null;
  has_disability?: boolean | null;
  disability_description?: string | null;
  other_conditions?: string | null;
  employment_level?: string | null;
  education_level?: string | null;
  has_special_conditions?: boolean | null;
  /** Peso nutricional de la persona (1 = adulto de referencia) */
  nutritional_weight?: number | null;
  status?: string | null;
  notes?: string | null;
}

export interface FamilyType {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface Family {
  id: string;
  organization_id?: string | null;
  is_direct?: boolean;
  source?: 'manual' | 'program_enrollment' | string | null;
  code?: string | null;
  name: string;
  registration_date?: string | null;
  phone?: string | null;
  email?: string | null;
  total_members?: number | null;
  status?: FamilyStatus | string | null;
  notes?: string | null;
  special_needs_notes?: string | null;
  housing_situation?: string | null;
  family_type?: FamilyType | null;
  address?: unknown;
  members?: FamilyMember[];
  head_of_household?: { id: string; full_name: string; document_number?: string | null } | null;
  /** Sólo para el alta (módulo apagado con la API real) */
  family_type_id?: string;
}

export interface FamiliesFilter {
  search?: string;
  status?: FamilyStatus;
  source?: FamilySource;
}

/** `GET /org/families/demographics` */
export interface Demographics {
  total_families: number;
  total_members: number;
  /** Beneficiarios ponderados por peso nutricional */
  weighted_beneficiaries?: number;
  family_types?: { name: string; code: string; count: number }[];
  age_groups?: Partial<Record<AgeGroup, number>>;
  special_conditions?: Partial<
    Record<'pregnant_women' | 'nursing_mothers' | 'diabetics' | 'celiacs' | 'lactose_intolerant' | 'disabled', number>
  >;
}
