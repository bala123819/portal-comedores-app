import { unitLabels } from './labels';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/**
 * Parsea fechas de la API: "YYYY-MM-DD", "YYYY-MM-DD HH:mm[:ss]" o ISO.
 * Las fechas sin hora se toman en hora local (no UTC) para no correr el día.
 */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const onlyDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (onlyDate) return new Date(+onlyDate[1], +onlyDate[2] - 1, +onlyDate[3]);
  const local = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (local)
    return new Date(+local[1], +local[2] - 1, +local[3], +local[4], +local[5], +(local[6] ?? 0));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "hoy", "mañana", "ayer", "jueves 3 oct" */
export function formatDay(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '—';
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'mañana';
  if (diff === -1) return 'ayer';
  const base = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function formatDate(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "09:00" o "09:00:00" → "9:00" */
export function formatTime(value: string | null | undefined): string {
  if (!value) return '';
  const m = /(\d{1,2}):(\d{2})/.exec(value);
  return m ? `${Number(m[1])}:${m[2]}` : value;
}

export function formatTimeRange(start?: string | null, end?: string | null): string {
  if (start && end) return `de ${formatTime(start)} a ${formatTime(end)} h`;
  if (start) return `desde las ${formatTime(start)} h`;
  if (end) return `hasta las ${formatTime(end)} h`;
  return '';
}

export function formatDateTime(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatDay(value)}, ${hh}:${mm} h`;
}

/** "hace 5 min", "hace 2 h", "hace 3 días" */
export function formatRelative(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'recién';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86_400) return `hace ${Math.floor(s / 3600)} h`;
  const days = Math.floor(s / 86_400);
  return days === 1 ? 'ayer' : days < 30 ? `hace ${days} días` : formatDate(value);
}

/** Tiempo hasta el vencimiento. `null` en la API = "Sin vencimiento". */
export function formatDeadline(deadline: string | null | undefined): {
  text: string;
  urgent: boolean;
  expired: boolean;
} {
  if (!deadline) return { text: 'Sin vencimiento', urgent: false, expired: false };
  const d = parseDate(deadline);
  if (!d) return { text: 'Sin vencimiento', urgent: false, expired: false };
  const hours = (d.getTime() - Date.now()) / 3_600_000;
  if (hours < 0) return { text: 'Vencida', urgent: false, expired: true };
  if (hours < 24) {
    const h = Math.max(1, Math.round(hours));
    return { text: `Vence en ${h} ${h === 1 ? 'hora' : 'horas'}`, urgent: true, expired: false };
  }
  return { text: `Vence ${formatDay(deadline)}`, urgent: hours < 48, expired: false };
}

const numberFormatter = (max: number) => ({
  format(n: number) {
    const fixed = Number(n.toFixed(max));
    const [int, dec] = String(fixed).split('.');
    const withThousands = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return dec ? `${withThousands},${dec}` : withThousands;
  },
});

/** Formato argentino: 1.234,5 */
export function formatNumber(n: number | null | undefined, maxDecimals = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return numberFormatter(maxDecimals).format(n);
}

/** "30 kilos", "1 paquete", "2,5 litros". Unidades como vienen de la API. */
export function formatQuantity(quantity: number | null | undefined, unit: string | null | undefined) {
  const q = formatNumber(quantity);
  if (!unit) return q;
  const u = unitLabels[unit];
  if (!u) return `${q} ${unit}`;
  return `${q} ${quantity === 1 ? u.one : u.many}`;
}

export function toISODate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function ageFrom(birthDate: string | null | undefined): number | null {
  const d = parseDate(birthDate);
  if (!d) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
