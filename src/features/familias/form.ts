/**
 * Reglas de los formularios de familias y miembros (alta, edición), según `form-config`
 * y los posts 5–7 de la API organizaciones en GoDubi.
 */
import { z } from 'zod';
import { isApiError } from '@/services/api/errors';
import { label } from '@/lib/labels';
import type { Family, FamilyFormConfig, FamilyMember, MemberInput } from './types';

/** Opciones de una lista según form-config (las define el banco); sin config, las de labels.ts */
export const options = (values: string[] | undefined, map: Record<string, string>) =>
  (values ?? Object.keys(map)).map((value) => ({ value, label: label(map, value) }));

export type FieldRule = { enabled: boolean; required: boolean };
export const fieldConfig = (cfg: FamilyFormConfig | undefined, name: string): FieldRule =>
  cfg?.config.required_fields[name] ?? { enabled: true, required: false };
export const fieldLabel = (text: string, f: FieldRule) => (f.required ? text : `${text} (opcional)`);

export const CONDITIONS = [
  ['is_pregnant', 'Embarazada'],
  ['is_nursing_mother', 'Amamantando'],
  ['is_celiac', 'Celíaco/a'],
  ['is_diabetic', 'Diabético/a'],
  ['is_lactose_intolerant', 'Intolerante a la lactosa'],
  ['has_disability', 'Discapacidad'],
] as const;

/** dd/mm/aaaa → AAAA-MM-DD (la API usa ISO) */
export const toIso = (d?: string) => {
  const m = d ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d) : null;
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
/** AAAA-MM-DD → dd/mm/aaaa */
export const fromIso = (d?: string | null) => {
  const m = d ? /^(\d{4})-(\d{2})-(\d{2})/.exec(d) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

const optionalEmail = z.union([z.literal(''), z.string().trim().email('Revisá el email')]).optional();

export const memberSchema = z.object({
  first_name: z.string().trim().min(1, 'Obligatorio').max(100),
  last_name: z.string().trim().min(1, 'Obligatorio').max(100),
  document_number: z.string().trim().max(30).optional(),
  birth_date: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{2}\/\d{2}\/\d{4}$/.test(v), 'Usá el formato día/mes/año')
    .optional(),
  relationship: z.string().optional(),
  gender: z.string().optional(),
  employment_level: z.string().optional(),
  education_level: z.string().optional(),
  phone: z.string().trim().max(50).optional(),
  email: optionalEmail,
  disability_description: z.string().trim().max(500).optional(),
  other_conditions: z.string().trim().max(500).optional(),
  notes: z.string().max(2000).optional(),
  is_pregnant: z.boolean(),
  is_nursing_mother: z.boolean(),
  is_celiac: z.boolean(),
  is_diabetic: z.boolean(),
  is_lactose_intolerant: z.boolean(),
  has_disability: z.boolean(),
});
export type MemberValues = z.infer<typeof memberSchema>;

export const emptyMember = (): MemberValues => ({
  first_name: '',
  last_name: '',
  document_number: '',
  birth_date: '',
  relationship: undefined,
  gender: undefined,
  employment_level: undefined,
  education_level: undefined,
  phone: '',
  email: '',
  disability_description: '',
  other_conditions: '',
  notes: '',
  is_pregnant: false,
  is_nursing_mother: false,
  is_celiac: false,
  is_diabetic: false,
  is_lactose_intolerant: false,
  has_disability: false,
});

export const memberToValues = (m: FamilyMember): MemberValues => ({
  first_name: m.first_name ?? '',
  last_name: m.last_name ?? '',
  document_number: m.document_number ?? '',
  birth_date: fromIso(m.birth_date),
  relationship: m.relationship ?? undefined,
  gender: m.gender ?? undefined,
  employment_level: m.employment_level ?? undefined,
  education_level: m.education_level ?? undefined,
  phone: m.phone ?? '',
  email: m.email ?? '',
  disability_description: m.disability_description ?? '',
  other_conditions: m.other_conditions ?? '',
  notes: m.notes ?? '',
  is_pregnant: !!m.is_pregnant,
  is_nursing_mother: !!m.is_nursing_mother,
  is_celiac: !!m.is_celiac,
  is_diabetic: !!m.is_diabetic,
  is_lactose_intolerant: !!m.is_lactose_intolerant,
  has_disability: !!m.has_disability,
});

const text = (v?: string) => v?.trim() || null;

/** Body del miembro para la API. Los campos que el banco deshabilitó en form-config no se mandan. */
export function memberBody(m: MemberValues, cfg: FamilyFormConfig | undefined): MemberInput {
  const employment = fieldConfig(cfg, 'employment_level');
  const education = fieldConfig(cfg, 'education_level');
  const dni = text(m.document_number);
  return {
    first_name: m.first_name.trim(),
    last_name: m.last_name.trim(),
    document_number: dni,
    document_type: dni ? 'dni' : null,
    birth_date: toIso(m.birth_date),
    relationship: m.relationship || null,
    is_head_of_household: m.relationship === 'jefe_hogar',
    gender: m.gender || null,
    employment_level: employment.enabled ? m.employment_level || null : undefined,
    education_level: education.enabled ? m.education_level || null : undefined,
    phone: text(m.phone),
    email: text(m.email),
    is_pregnant: m.is_pregnant,
    is_nursing_mother: m.is_nursing_mother,
    is_celiac: m.is_celiac,
    is_diabetic: m.is_diabetic,
    is_lactose_intolerant: m.is_lactose_intolerant,
    has_disability: m.has_disability,
    disability_description: m.has_disability ? text(m.disability_description) : null,
    other_conditions: text(m.other_conditions),
    notes: text(m.notes),
  };
}

export const familySchema = z.object({
  name: z.string().trim().min(2, 'Escribí un nombre para la familia').max(255),
  family_type_id: z.string().min(1, 'Elegí el tipo de familia'),
  phone: z.string().trim().max(50).optional(),
  email: optionalEmail,
  housing_situation: z.string().optional(),
  special_needs_notes: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});
export type FamilyValues = z.infer<typeof familySchema>;

export const emptyFamily = (): FamilyValues => ({
  name: '',
  family_type_id: '',
  phone: '',
  email: '',
  housing_situation: undefined,
  special_needs_notes: '',
  notes: '',
});

export const familyToValues = (f: Family): FamilyValues => ({
  name: f.name ?? '',
  family_type_id: f.family_type?.id ?? f.family_type_id ?? '',
  phone: f.phone ?? '',
  email: f.email ?? '',
  housing_situation: f.housing_situation ?? undefined,
  special_needs_notes: f.special_needs_notes ?? '',
  notes: f.notes ?? '',
});

/** Body de la familia (sin miembros). Los campos que el banco deshabilitó no se mandan. */
export function familyBody(v: FamilyValues, cfg: FamilyFormConfig | undefined) {
  return {
    name: v.name.trim(),
    family_type_id: v.family_type_id,
    phone: text(v.phone),
    email: fieldConfig(cfg, 'email').enabled ? text(v.email) : undefined,
    housing_situation: fieldConfig(cfg, 'housing_situation').enabled ? v.housing_situation || null : undefined,
    special_needs_notes: text(v.special_needs_notes),
    notes: text(v.notes),
  };
}

/**
 * Campos que el banco marca `required` en form-config y están vacíos (la API los exige en el alta).
 * Devuelve `[ruta del campo, mensaje]` para `setError`.
 */
export function missingRequired(
  cfg: FamilyFormConfig | undefined,
  family: Partial<FamilyValues> | null,
  members: { prefix: string; values: Partial<MemberValues> }[],
): [string, string][] {
  const out: [string, string][] = [];
  const req = (name: string) => {
    const f = fieldConfig(cfg, name);
    return f.enabled && f.required;
  };
  if (family) {
    if (req('housing_situation') && !family.housing_situation) out.push(['housing_situation', 'Elegí la situación de vivienda']);
    if (req('email') && !family.email?.trim()) out.push(['email', 'Escribí un email']);
  }
  for (const { prefix, values } of members) {
    if (req('employment_level') && !values.employment_level) out.push([`${prefix}employment_level`, 'Elegí la situación laboral']);
    if (req('education_level') && !values.education_level) out.push([`${prefix}education_level`, 'Elegí el nivel educativo']);
  }
  return out;
}

/** Sólo los campos que cambiaron: la API pide mandar sólo lo que se toca (`PUT`). */
export function changedFields<T extends object>(before: T, after: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(after) as (keyof T)[]) {
    if (after[key] === undefined) continue;
    if ((before[key] ?? null) !== (after[key] ?? null)) out[key] = after[key];
  }
  return out;
}

/** La app no edita familias suspendidas por el banco ni las que el banco carga por un programa. */
export function familyLock(f: Family): string | null {
  if (f.status === 'suspendida')
    return 'El banco suspendió esta familia. Para reactivarla o cambiarla, pedíselo al Banco de Alimentos.';
  if (f.source && f.source !== 'manual')
    return 'Esta familia la carga el Banco de Alimentos por un programa: se ve pero no se edita desde la app.';
  return null;
}

/** Mensaje para los errores de negocio de familias (se ramifica por `error_code`, no por el texto). */
export function familyErrorMessage(e: unknown): string | null {
  if (!isApiError(e)) return null;
  switch (e.code) {
    case 'FAMILY_SUSPENDED_BY_BANK':
      return 'El banco suspendió esta familia. Para reactivarla o cambiarla, pedíselo al Banco de Alimentos.';
    case 'FAMILY_MANAGED_BY_BANK':
      return 'Esta familia la carga el Banco de Alimentos por un programa: no se edita desde la app.';
    case 'ORGANIZATION_NOT_ACTIVE':
      return 'La organización no está activa: podés ver los datos pero no cambiarlos. Consultá con el Banco de Alimentos.';
    case 'FAMILY_NOT_FOUND':
      return 'No encontramos la familia. Puede que ya la hayan dado de baja.';
  }
  if (e.kind === 'forbidden') return 'Tu usuario no tiene permiso para cambiar familias. Pedíselo al Banco de Alimentos.';
  return null;
}

/** 409 al borrar una familia con entregas o programas vigentes: hay que pasarla a inactiva. */
export const isDeleteBlocked = (e: unknown) => isApiError(e) && e.kind === 'conflict' && !e.code;
