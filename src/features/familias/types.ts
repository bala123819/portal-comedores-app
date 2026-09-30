/** Campos de `POST /organizations/{id}/families` y de members */
export type FamilyStatus = 'activa' | 'inactiva' | 'suspendida';

export interface FamilyMember {
  id: string;
  first_name: string;
  last_name: string;
  document_number?: string | null;
  document_type?: 'dni' | 'pasaporte' | 'otro' | string | null;
  birth_date?: string | null;
  gender?: string | null;
  relationship?: string | null;
  is_head_of_household?: boolean | null;
  phone?: string | null;
  email?: string | null;
  employment_level?: string | null;
  education_level?: string | null;
  is_pregnant?: boolean | null;
  is_nursing_mother?: boolean | null;
  is_diabetic?: boolean | null;
  is_celiac?: boolean | null;
  is_lactose_intolerant?: boolean | null;
  has_disability?: boolean | null;
  disability_description?: string | null;
  other_conditions?: string | null;
  notes?: string | null;
}

export interface FamilyType {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
}

export interface Family {
  id: string;
  name: string;
  family_type_id?: string;
  family_type?: FamilyType | null;
  source?: 'manual' | 'program_enrollment' | string | null;
  registration_date?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: FamilyStatus | string | null;
  notes?: string | null;
  special_needs_notes?: string | null;
  housing_situation?: string | null;
  members?: FamilyMember[];
  members_count?: number | null;
}

/** `GET /org/families/demographics`: forma sin documentar → se renderiza genéricamente */
export type Demographics = Record<string, unknown>;
