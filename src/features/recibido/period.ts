/**
 * Períodos para "Lo recibido" y meses para el panel nutricional.
 * El backend acepta hasta 1 año y, sin `from`/`to`, usa los últimos 90 días.
 */
import { toISODate } from '@/lib/format';

export const RECEIVED_PERIODS = [
  { key: '30d', label: 'Último mes', days: 30 },
  { key: '90d', label: 'Últimos 3 meses', days: 90 },
  { key: '180d', label: 'Últimos 6 meses', days: 180 },
  { key: '365d', label: 'Último año', days: 364 },
] as const;

export type ReceivedPeriodKey = (typeof RECEIVED_PERIODS)[number]['key'];

/** `{ from, to }` en AAAA-MM-DD para un período que termina hoy */
export function periodRange(key: ReceivedPeriodKey, today = new Date()): { from: string; to: string } {
  const days = RECEIVED_PERIODS.find((p) => p.key === key)?.days ?? 90;
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
  return { from: toISODate(from), to: toISODate(today) };
}

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Mes actual en AAAA-MM */
export function currentMonth(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

/** "2026-10" + 1 → "2026-11" */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return currentMonth(d);
}

/**
 * "2026-10" → "octubre 2026" (o "octubre" si es del año en curso y `short`).
 * `capitalized` pone en mayúscula sólo la primera letra ("Octubre 2026").
 */
export function monthLabel(month: string, short = false, capitalized = false): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return month;
  const name = MONTH_NAMES[Number(m[2]) - 1] ?? month;
  const text = short && Number(m[1]) === new Date().getFullYear() ? name : `${name} ${m[1]}`;
  return capitalized ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
