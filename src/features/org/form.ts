/**
 * Formularios del perfil de la organización (post 3/14): valores del form ⇄ cuerpo de la API.
 * Se mandan sólo los campos que cambiaron (como en familias, G-15: un `""` o `null` borra el dato).
 */
import { z } from 'zod';
import {
  PICKUP_DAYS,
  type ColdCapacityType,
  type Organization,
  type OrgLogistics,
  type TransportVehicleType,
  type UpdateLogisticsBody,
  type UpdateProfileBody,
} from './types';

/** La API manda decimales como texto ("300.00") */
export function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** "09:00:00" → "09:00" */
export function toHHMM(v: string | null | undefined): string {
  const m = v ? /^(\d{1,2}):(\d{2})/.exec(v) : null;
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

/** Lo que se tipea en un campo de hora: sólo números y los dos puntos solos ("930" → "9:30", "0930" → "09:30") */
export function maskTime(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return d.length === 3 ? `${d[0]}:${d.slice(1)}` : `${d.slice(0, 2)}:${d.slice(2)}`;
}

const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;
const optionalText = (max: number) => z.string().trim().max(max, `Hasta ${max} caracteres`);
const decimal = (msg: string) =>
  z.string().trim().refine((v) => v === '' || (toNumber(v) !== null && toNumber(v)! >= 0), msg);

// ─── Perfil ────────────────────────────────────────────────────────────────

export const profileSchema = z
  .object({
    phone: optionalText(50),
    email: z.string().trim().refine((v) => v === '' || z.email().safeParse(v).success, 'El email no es válido'),
    description: optionalText(1000),
    pickup_preference: z.enum(['pickup', 'delivery']),
    preferred_pickup_days: z.array(z.enum(PICKUP_DAYS)),
    preferred_pickup_time_start: z.string().trim().refine((v) => v === '' || HHMM.test(v), 'Usá el formato 09:00'),
    preferred_pickup_time_end: z.string().trim().refine((v) => v === '' || HHMM.test(v), 'Usá el formato 12:00'),
    has_refrigeration: z.boolean(),
    vehicle_capacity_kg: decimal('Escribí los kilos con números'),
  })
  .refine(
    (v) =>
      !v.preferred_pickup_time_start ||
      !v.preferred_pickup_time_end ||
      toHHMM(v.preferred_pickup_time_end) > toHHMM(v.preferred_pickup_time_start),
    { path: ['preferred_pickup_time_end'], message: 'Tiene que ser después del horario de inicio' },
  );
export type ProfileValues = z.infer<typeof profileSchema>;

export function profileDefaults(o: Organization): ProfileValues {
  const days = (o.preferred_pickup_days ?? [])
    .map((d) => d.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase())
    .filter((d): d is (typeof PICKUP_DAYS)[number] => (PICKUP_DAYS as readonly string[]).includes(d));
  const cap = toNumber(o.vehicle_capacity_kg);
  return {
    phone: o.phone ?? '',
    email: o.email ?? '',
    description: o.description ?? '',
    pickup_preference: o.pickup_preference === 'delivery' ? 'delivery' : 'pickup',
    preferred_pickup_days: days,
    preferred_pickup_time_start: toHHMM(o.preferred_pickup_time_start),
    preferred_pickup_time_end: toHHMM(o.preferred_pickup_time_end),
    has_refrigeration: !!o.has_refrigeration,
    vehicle_capacity_kg: cap === null ? '' : String(cap),
  };
}

/** Cuerpo de `PUT /org/profile` con lo que cambió respecto de `initial` (vacío = nada para guardar) */
export function profileBody(v: ProfileValues, initial: ProfileValues): UpdateProfileBody {
  const body: UpdateProfileBody = {};
  const text = (s: string) => s.trim() || null;
  if (v.phone.trim() !== initial.phone) body.phone = text(v.phone);
  if (v.email.trim() !== initial.email) body.email = text(v.email);
  if (v.description.trim() !== initial.description) body.description = text(v.description);
  if (v.pickup_preference !== initial.pickup_preference) body.pickup_preference = v.pickup_preference;
  const days = PICKUP_DAYS.filter((d) => v.preferred_pickup_days.includes(d));
  if (days.join() !== PICKUP_DAYS.filter((d) => initial.preferred_pickup_days.includes(d)).join()) {
    body.preferred_pickup_days = days;
  }
  const start = toHHMM(v.preferred_pickup_time_start);
  const end = toHHMM(v.preferred_pickup_time_end);
  // El backend valida el rango con los dos horarios: si cambia uno, van los dos.
  if (start !== initial.preferred_pickup_time_start || end !== initial.preferred_pickup_time_end) {
    body.preferred_pickup_time_start = start || null;
    body.preferred_pickup_time_end = end || null;
  }
  if (v.has_refrigeration !== initial.has_refrigeration) body.has_refrigeration = v.has_refrigeration;
  if (toNumber(v.vehicle_capacity_kg) !== toNumber(initial.vehicle_capacity_kg)) {
    body.vehicle_capacity_kg = toNumber(v.vehicle_capacity_kg);
  }
  return body;
}

/** Los 422 de los días llegan por posición (`preferred_pickup_days.0`): se muestran en el campo */
export const profileFieldMap = Object.fromEntries(
  PICKUP_DAYS.map((_, i) => [`preferred_pickup_days.${i}`, 'preferred_pickup_days' as const]),
);

// ─── Capacidad logística ───────────────────────────────────────────────────

const COLD_TYPES = ['heladera', 'freezer', 'camara_frigorifica', 'ninguna'] as const satisfies readonly ColdCapacityType[];
const VEHICLE_TYPES = ['camioneta', 'camion', 'moto', 'otro'] as const satisfies readonly TransportVehicleType[];
export { COLD_TYPES, VEHICLE_TYPES };

export const logisticsSchema = z.object({
  cold_capacity_type: z.enum(COLD_TYPES).or(z.literal('')),
  cold_capacity_m3: decimal('Escribí los metros cúbicos con números'),
  own_transport_capable: z.boolean(),
  transport_vehicle_type: z.enum(VEHICLE_TYPES).or(z.literal('')),
  transport_notes: optionalText(1000),
  operational_contact_name: optionalText(255),
  operational_contact_phone: optionalText(50),
  operational_contact_email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'El email no es válido'),
});
export type LogisticsValues = z.infer<typeof logisticsSchema>;

export function logisticsDefaults(l: OrgLogistics | undefined): LogisticsValues {
  const m3 = toNumber(l?.cold_capacity_m3);
  return {
    cold_capacity_type: l?.cold_capacity_type ?? '',
    cold_capacity_m3: m3 === null ? '' : String(m3),
    own_transport_capable: !!l?.own_transport_capable,
    transport_vehicle_type: l?.transport_vehicle_type ?? '',
    transport_notes: l?.transport_notes ?? '',
    operational_contact_name: l?.operational_contact_name ?? '',
    operational_contact_phone: l?.operational_contact_phone ?? '',
    operational_contact_email: l?.operational_contact_email ?? '',
  };
}

/** Cuerpo de `PUT /org/logistics` con lo que cambió respecto de `initial` */
export function logisticsBody(v: LogisticsValues, initial: LogisticsValues): UpdateLogisticsBody {
  const body: UpdateLogisticsBody = {};
  const text = (s: string) => s.trim() || null;
  // Sin vehículo propio no tiene sentido guardar el tipo de vehículo
  const vehicle = v.own_transport_capable ? v.transport_vehicle_type : '';
  if (v.cold_capacity_type !== initial.cold_capacity_type) body.cold_capacity_type = v.cold_capacity_type || null;
  if (toNumber(v.cold_capacity_m3) !== toNumber(initial.cold_capacity_m3)) body.cold_capacity_m3 = toNumber(v.cold_capacity_m3);
  if (v.own_transport_capable !== initial.own_transport_capable) body.own_transport_capable = v.own_transport_capable;
  if (vehicle !== initial.transport_vehicle_type) body.transport_vehicle_type = vehicle || null;
  for (const k of ['transport_notes', 'operational_contact_name', 'operational_contact_phone', 'operational_contact_email'] as const) {
    if (v[k].trim() !== initial[k]) body[k] = text(v[k]);
  }
  return body;
}
