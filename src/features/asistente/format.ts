import { formatDate } from '@/lib/format';
import { genderLabels, housingLabels, interactionTypeLabels, label, relationshipLabels } from '@/lib/labels';
import { ACTION_LABELS, isWriteAction, type PendingApproval } from '@/services/assistant';

/**
 * Traduce el `input` de una tarjeta a lenguaje humano. El contrato pide no mostrar ids ni
 * nombres técnicos: se muestran nombres, cantidades, fechas y textos.
 * Lógica pura (sin React) para poder probarla aparte.
 */
export interface ApprovalView {
  title: string;
  fields: { label: string; value: string }[];
  /** Integrantes o productos, uno por renglón */
  list?: { title: string; items: string[] };
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  first_name: 'Nombre',
  last_name: 'Apellido',
  title: 'Asunto',
  notes: 'Detalle',
  interaction_type: 'Tipo de aviso',
  requested_distribution_date: 'Fecha pedida',
  phone: 'Teléfono',
  email: 'Email',
  birth_date: 'Nacimiento',
  document_number: 'Documento',
  relationship: 'Parentesco',
  housing_situation: 'Vivienda',
  special_needs_notes: 'Necesidades especiales',
  other_conditions: 'Otras condiciones',
  disability_description: 'Discapacidad',
  status: 'Estado',
  gender: 'Género',
};

const CONDITIONS: Record<string, string> = {
  is_celiac: 'celíaco/a',
  is_diabetic: 'diabético/a',
  is_pregnant: 'embarazada',
  is_nursing_mother: 'en lactancia',
  is_lactose_intolerant: 'intolerancia a la lactosa',
  has_disability: 'con discapacidad',
};

/** Claves técnicas que no se muestran nunca */
const HIDDEN = /(^id$|_id$|^ids$|_ids$|organization|tenant|connection|^code$|^source$|^is_head_of_household$)/;

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}/.test(v);

function formatValue(key: string, v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Sí' : null;
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string') return null;
  if (key === 'interaction_type') return label(interactionTypeLabels, v);
  if (key === 'relationship') return label(relationshipLabels, v);
  if (key === 'housing_situation') return label(housingLabels, v);
  if (key === 'gender') return label(genderLabels, v);
  if (isDate(v)) return formatDate(v);
  return v;
}

function conditionsOf(o: Record<string, unknown>): string[] {
  return Object.entries(CONDITIONS)
    .filter(([k]) => o[k] === true)
    .map(([, l]) => l);
}

/** Un integrante en un renglón: "Tomás Pérez · Hijo/a · 03/08/2016 · celíaco/a" */
function memberLine(o: Record<string, unknown>): string {
  const name = [o.first_name, o.last_name].filter(Boolean).join(' ') || String(o.full_name ?? o.name ?? 'Integrante');
  const parts = [name];
  if (o.is_head_of_household === true) parts.push('Jefe/a de hogar');
  else if (typeof o.relationship === 'string') parts.push(label(relationshipLabels, o.relationship));
  if (typeof o.birth_date === 'string') parts.push(formatDate(o.birth_date));
  parts.push(...conditionsOf(o));
  return parts.join(' · ');
}

/** Un producto en un renglón: "Arroz largo fino · 5 kg" */
function itemLine(o: Record<string, unknown>): string {
  const name = String(o.product_name ?? o.name ?? (o.product as { name?: string } | undefined)?.name ?? o.description ?? 'Producto');
  const qty = o.quantity_requested ?? o.quantity ?? o.kg ?? o.kg_requested;
  const unit = typeof o.unit === 'string' ? o.unit : qty !== undefined && (o.kg !== undefined || o.kg_requested !== undefined) ? 'kg' : '';
  return qty !== undefined ? `${name} · ${qty}${unit ? ` ${unit}` : ''}` : name;
}

/** Cualquier otro objeto: sus valores legibles separados por "·" */
function genericLine(o: Record<string, unknown>): string {
  return Object.entries(o)
    .filter(([k]) => !HIDDEN.test(k))
    .map(([k, v]) => formatValue(k, v))
    .filter((x): x is string => !!x)
    .join(' · ');
}

function lineFor(key: string, o: Record<string, unknown>): string {
  if (/member|integrante/i.test(key) || 'first_name' in o) return memberLine(o);
  if (/item|product/i.test(key) || 'product_id' in o || 'quantity_requested' in o) return itemLine(o);
  return genericLine(o);
}

export function describeApproval(a: Pick<PendingApproval, 'action' | 'input'>): ApprovalView {
  const title = isWriteAction(a.action) ? ACTION_LABELS[a.action] : 'Guardar datos';
  const fields: ApprovalView['fields'] = [];
  let list: ApprovalView['list'];
  const input = a.input ?? {};

  for (const [key, value] of Object.entries(input)) {
    if (HIDDEN.test(key) || key in CONDITIONS) continue;
    if (Array.isArray(value)) {
      const items = value
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => lineFor(key, x))
        .filter(Boolean);
      if (items.length) {
        const isMembers = /member|integrante/i.test(key);
        list = { title: isMembers ? `Integrantes (${items.length})` : `Productos (${items.length})`, items };
      }
      continue;
    }
    if (value && typeof value === 'object') {
      const line = genericLine(value as Record<string, unknown>);
      if (line) fields.push({ label: FIELD_LABELS[key] ?? label({}, key), value: line });
      continue;
    }
    const formatted = formatValue(key, value);
    if (formatted) fields.push({ label: FIELD_LABELS[key] ?? label({}, key), value: formatted });
  }

  // Alta o edición de un integrante suelto: sus condiciones en un campo aparte.
  const conds = conditionsOf(input);
  if (conds.length) fields.push({ label: 'Condiciones', value: conds.join(', ') });

  return { title, fields, list };
}

/** "9:41" restante hasta `expiresAt`; null si ya venció. */
export function remaining(expiresAt: string, now = Date.now()): string | null {
  const ms = new Date(expiresAt).getTime() - now;
  if (!(ms > 0)) return null;
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
