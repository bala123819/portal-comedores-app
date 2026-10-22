/**
 * Router de mocks: responde como la API Mermab (envoltorio, meta, 401/404/422, transiciones de
 * estado solo por acción, Idempotency-Key obligatoria en POST).
 */
import { apiConfig, type HttpMethod, type RequestOptions } from '@/services/api/client';
import { randomUUID } from 'expo-crypto';
import type { Family, FamilyMember } from '@/features/familias/types';
import { formatNumber } from '@/lib/format';
import { createMockDb, ORG_ID } from './data';

let db = createMockDb();
const idempotencyCache = new Map<string, unknown>();

export function resetMockDb() {
  db = createMockDb();
  idempotencyCache.clear();
}

const MOCK_TOKEN = 'mock-token';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
const ok = (data: unknown) => json(200, { success: true, data });
const fail = (status: number, message: string, errors?: Record<string, string[]>) =>
  json(status, { success: false, message, errors });

function paginate<T>(items: T[], query: RequestOptions['query']) {
  const perPage = Number(query?.per_page ?? 15);
  const page = Number(query?.page ?? 1);
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  return json(200, {
    success: true,
    data: items.slice((page - 1) * perPage, page * perPage),
    meta: { current_page: page, last_page: lastPage, per_page: perPage, total },
  });
}

type Params = Record<string, string>;
type Handler = (p: Params, o: RequestOptions) => Response;
type Route = [HttpMethod, RegExp, string[], Handler];

const routes: Route[] = [];
function on(method: HttpMethod, pattern: string, handler: Handler) {
  const names: string[] = [];
  const re = new RegExp(
    '^' +
      pattern.replace(/:(\w+)/g, (_, n) => {
        names.push(n);
        return '([^/]+)';
      }) +
      '$',
  );
  routes.push([method, re, names, handler]);
}

const body = (o: RequestOptions) => (o.body ?? {}) as Record<string, unknown>;
const now = () => new Date().toISOString();

function transition(id: string, from: string[], to: string, extra: Record<string, unknown> = {}) {
  const a = db.assignments.find((x) => x.id === id);
  if (!a) return fail(404, 'Asignación no encontrada');
  if (!from.includes(String(a.status)))
    return fail(422, `No se puede pasar de "${a.status}" a "${to}"`);
  Object.assign(a, { status: to }, extra);
  return ok(a);
}

// ─── Sistema / auth (formas de docs/bda/02) ─────────────────────────────────
on('GET', '/health', () => json(200, { status: 'ok', timestamp: now(), version: '4.0.0 (mock)' }));
on('GET', '/capabilities', () =>
  ok({ modules: ['org_portal', 'notifications'], permissions: db.me.permissions, rate_limits: { general: 60, auth: 10 } }),
);
on('POST', '/auth/login', (_, o) => {
  const b = body(o);
  const errors: Record<string, string[]> = {};
  if (!b.email) errors.email = ['El correo electrónico es obligatorio.'];
  if (!b.password) errors.password = ['La contraseña es obligatoria.'];
  if (Object.keys(errors).length) return fail(422, Object.values(errors)[0][0], errors);
  // El servidor real responde 422 (no 401) con clave incorrecta
  if (b.password === 'incorrecta')
    return fail(422, 'Las credenciales proporcionadas son incorrectas.', {
      email: ['Las credenciales proporcionadas son incorrectas.'],
    });
  const { phone: _p, tenant: _t, is_active: _a, last_login_at: _l, preferences: _pr, ...user } = db.me;
  return ok({ user, access_token: MOCK_TOKEN, token_type: 'Bearer', expires_in: 86400 });
});
on('POST', '/auth/logout', () => json(200, { success: true, message: 'Sesión cerrada exitosamente' }));
on('POST', '/auth/refresh', () =>
  json(200, { success: true, message: 'Token renovado exitosamente', data: { access_token: MOCK_TOKEN, token_type: 'Bearer', expires_in: 86400 } }),
);
on('GET', '/auth/me', () => ok(db.me));
on('PUT', '/auth/profile', (_, o) => {
  const b = body(o);
  if (b.phone != null && !/^[\d\s+\-()]{6,20}$/.test(String(b.phone)))
    return fail(422, 'El formato del teléfono no es válido', { phone: ['El formato del teléfono no es válido'] });
  Object.assign(db.me, b);
  db.me.full_name = `${db.me.first_name} ${db.me.last_name}`;
  return json(200, { success: true, message: 'Perfil actualizado exitosamente', data: db.me });
});
on('PUT', '/auth/password', (_, o) => {
  const b = body(o);
  if (b.current_password === 'incorrecta')
    return fail(422, 'La contraseña actual es incorrecta.', { current_password: ['La contraseña actual es incorrecta.'] });
  if (String(b.new_password ?? '').length < 8 || b.new_password !== b.new_password_confirmation)
    return fail(422, 'La confirmación de la nueva contraseña no coincide.', {
      new_password: ['La confirmación de la nueva contraseña no coincide.'],
    });
  return json(200, { success: true, message: 'Contraseña actualizada exitosamente' });
});

// ─── Portal Organización ───────────────────────────────────────────────────
on('GET', '/org/profile', () =>
  ok({ organization: db.organization, user: { id: db.me.id, full_name: db.me.full_name, email: db.me.email } }),
);
// PUT /org/profile (post 3/14): sólo campos editables; lo demás → 422 FIELD_NOT_EDITABLE
const EDITABLE_PROFILE_FIELDS = [
  'email',
  'phone',
  'description',
  'pickup_preference',
  'preferred_pickup_days',
  'preferred_pickup_time_start',
  'preferred_pickup_time_end',
  'has_refrigeration',
  'vehicle_capacity_kg',
];
const DAYS_MESSAGE = 'Los días van en minúscula y sin tilde: lunes, martes, miercoles, jueves, viernes, sabado.';
on('PUT', '/org/profile', (_, o) => {
  const b = body(o);
  const locked = Object.keys(b).filter((k) => !EDITABLE_PROFILE_FIELDS.includes(k));
  if (locked.length)
    return json(422, {
      success: false,
      message: `Estos datos no se pueden cambiar desde la app: ${locked.join(', ')}. Pedíselo al banco.`,
      error_code: 'FIELD_NOT_EDITABLE',
      details: { fields: locked, editable_fields: EDITABLE_PROFILE_FIELDS },
    });
  const errors: Record<string, string[]> = {};
  if (b.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.email))) errors.email = ['El email no es válido.'];
  if (b.pickup_preference !== undefined && !['pickup', 'delivery'].includes(String(b.pickup_preference)))
    errors.pickup_preference = ['La preferencia tiene que ser pickup (retiran ustedes) o delivery (se la llevan).'];
  ((b.preferred_pickup_days as string[] | undefined) ?? []).forEach((d, i) => {
    if (!['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].includes(d)) errors[`preferred_pickup_days.${i}`] = [DAYS_MESSAGE];
  });
  const start = (b.preferred_pickup_time_start as string | null | undefined) ?? db.organization.preferred_pickup_time_start?.slice(0, 5);
  const end = (b.preferred_pickup_time_end as string | null | undefined) ?? db.organization.preferred_pickup_time_end?.slice(0, 5);
  if (start && end && end <= start)
    errors.preferred_pickup_time_end = ['El horario de fin tiene que ser posterior al de inicio.'];
  if (Object.keys(errors).length) return fail(422, Object.values(errors)[0][0], errors);
  const withSeconds = (t: unknown) => (typeof t === 'string' && t ? `${t.slice(0, 5)}:00` : null);
  for (const k of EDITABLE_PROFILE_FIELDS) {
    if (!(k in b)) continue;
    const v = b[k];
    (db.organization as unknown as Record<string, unknown>)[k] = k.startsWith('preferred_pickup_time')
      ? withSeconds(v)
      : k === 'vehicle_capacity_kg'
        ? v == null ? null : Number(v).toFixed(2)
        : v === '' ? null : v;
  }
  return ok({ organization: db.organization, user: { id: db.me.id, full_name: db.me.full_name, email: db.me.email } });
});
on('GET', '/org/logistics', () => ok(db.logistics));
on('PUT', '/org/logistics', (_, o) => {
  const b = body(o);
  const errors: Record<string, string[]> = {};
  // El servidor real responde estos 422 en inglés (G-20)
  if (b.cold_capacity_m3 != null && !(Number(b.cold_capacity_m3) >= 0))
    errors.cold_capacity_m3 = ['The cold capacity m3 field must be at least 0.'];
  if (b.cold_capacity_type != null && !['camara_frigorifica', 'freezer', 'heladera', 'ninguna'].includes(String(b.cold_capacity_type)))
    errors.cold_capacity_type = ['The selected cold capacity type is invalid.'];
  if (b.transport_vehicle_type != null && !['camion', 'camioneta', 'moto', 'otro'].includes(String(b.transport_vehicle_type)))
    errors.transport_vehicle_type = ['The selected transport vehicle type is invalid.'];
  if (b.operational_contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.operational_contact_email)))
    errors.operational_contact_email = ['The operational contact email field must be a valid email address.'];
  if (Object.keys(errors).length) return fail(422, Object.values(errors)[0][0], errors);
  db.logistics = { ...db.logistics, ...b, updated_at: now() };
  return json(200, { success: true, message: 'Capacidad logística actualizada', data: db.logistics });
});
on('GET', '/org/social-data', () =>
  ok({
    organization_id: ORG_ID,
    fields: {
      fantasy_name: 'Los Girasoles',
      interviewed_by: 'Equipo social del Banco',
      founding_year: 2009,
      has_legal_status: true,
      legal_status_type: 'Asociación civil',
      delivers_viandas: true,
      viandas_notes: 'Los viernes, para llevar',
      generates_own_income: false,
      income_methods: [],
      water_source: 'red_publica',
      has_bathroom: true,
      cooking_sources: ['gas_envasado'],
      property_ownership: 'comodato',
      storage_methods: ['estante', 'heladera', 'freezer'],
      terms_accepted_at: '2026-03-02T14:00:00.000000Z',
      terms_accepted_by: db.me.id,
    },
    fiscal_address: null,
    services: [],
    meal_schedule: [],
    funding_sources: [],
    kitchen_equipment: [],
  }),
);
on('GET', '/org/documents', () => ok(db.documents));
on('GET', '/org/documents/:id/download', (p) => {
  const d = db.documents.find((x) => x.id === p.id);
  // Igual que el servidor hoy (G-20): el documento listado no tiene archivo
  if (!d || d.is_expired) return failCode(404, 'Documento no encontrado', 'DOCUMENT_NOT_FOUND');
  return new Response('%PDF-1.4\n% documento de prueba\n', { status: 200, headers: { 'Content-Type': 'application/pdf' } });
});
on('GET', '/org/requirements', () => ok(db.requirements));
on('GET', '/org/stats', () =>
  ok({
    postulaciones: {
      total: db.applications.length,
      pendientes: db.applications.filter((a) => a.status === 'pendiente').length,
      aprobadas: db.applications.filter((a) => a.status === 'aprobada').length,
      rechazadas: 0,
    },
    asignaciones: {
      total: db.assignments.length,
      pendientes: db.assignments.filter((a) => ['asignada', 'confirmada', 'en_camino'].includes(String(a.status))).length,
      completadas: db.assignments.filter((a) => a.status === 'completada').length,
      canceladas: 0,
      este_mes: 1,
    },
    impacto: { total_kg_recibidos: 30, total_distribuciones: 1 },
    disponibilidad: { mermas_disponibles: db.mermas.filter((m) => m.status === 'activa').length },
  }),
);
on('PUT', '/org/address', (_, o) => {
  const b = body(o);
  const lat = Number(b.latitude);
  const lng = Number(b.longitude);
  // Bug conocido del servidor: dato inválido → 500 (no 422). La app valida antes de enviar.
  if (!b.street || !b.city || !b.state || !(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180))
    return fail(500, 'Error interno del servidor');
  const address = {
    street: String(b.street),
    street_number: (b.street_number as string) ?? null,
    neighborhood: (b.neighborhood as string) ?? null,
    city: String(b.city),
    state: String(b.state),
    postal_code: (b.postal_code as string) ?? null,
    full_address: [[b.street, b.street_number].filter(Boolean).join(' '), b.neighborhood, b.city, b.state].filter(Boolean).join(', '),
    latitude: lat.toFixed(8),
    longitude: lng.toFixed(8),
  };
  db.organization.address = address;
  return json(200, {
    success: true,
    message: 'Dirección actualizada. No se encontró una zona geográfica compatible.',
    data: { address, geographic_zone: null, zone_assigned: false },
  });
});
on('GET', '/org/mermas/available', (_, o) => {
  let items = db.mermas.filter((m) => m.status === 'activa');
  if (o.query?.urgent === 'true') items = items.filter((m) => m.is_urgent);
  if (o.query?.priority) items = items.filter((m) => m.priority === o.query?.priority);
  if (o.query?.max_distance)
    items = items.filter((m) => (m.distance_km ?? 0) <= Number(o.query?.max_distance));
  return paginate(items, o.query);
});
on('GET', '/org/mermas/:id', (p) => {
  const m = db.mermas.find((x) => x.id === p.id);
  return m ? ok(m) : fail(404, 'Merma no encontrada');
});
on('GET', '/org/applications', (_, o) => {
  let items = [...db.applications].reverse();
  if (o.query?.status) items = items.filter((a) => a.status === o.query?.status);
  return paginate(items, o.query);
});
on('GET', '/org/applications/:id', (p) => {
  const a = db.applications.find((x) => x.id === p.id);
  return a ? ok(a) : fail(404, 'Postulación no encontrada');
});
on('POST', '/org/applications', (_, o) => {
  const b = body(o);
  const merma = db.mermas.find((m) => m.id === b.merma_id);
  if (!merma) return fail(422, 'Datos inválidos', { merma_id: ['La merma no existe.'] });
  if (merma.status !== 'activa') return fail(422, 'Esta merma ya no está disponible');
  if (db.applications.some((a) => a.merma_id === merma.id && a.status === 'pendiente'))
    return fail(422, 'Ya te postulaste a esta merma');
  const app = {
    id: `app-${Date.now()}`,
    merma_id: merma.id,
    organization_id: ORG_ID,
    status: 'pendiente',
    message: (b.message as string) ?? null,
    can_pickup_immediately: Boolean(b.can_pickup_immediately),
    preferred_pickup_time: (b.preferred_pickup_time as string) ?? null,
    requires_transport_help: Boolean(b.requires_transport_help),
    created_at: now(),
    merma,
  };
  db.applications.push(app);
  db.notifications.unshift({
    id: `n-${Date.now()}`,
    type: 'postulacion_recibida',
    title: 'Recibimos tu pedido',
    body: `${merma.title}: el Banco lo va a revisar.`,
    is_read: false,
    read_at: null,
    created_at: now(),
    data: { application_id: app.id },
  });
  return json(201, { success: true, data: app });
});
on('DELETE', '/org/applications/:id', (p) => {
  const a = db.applications.find((x) => x.id === p.id);
  if (!a) return fail(404, 'Postulación no encontrada');
  if (a.status !== 'pendiente') return fail(422, 'Solo se pueden cancelar postulaciones pendientes');
  a.status = 'cancelada';
  return ok(a);
});
on('GET', '/org/assignments', (_, o) => {
  let items = [...db.assignments];
  const s = o.query?.status;
  if (s === 'pending')
    items = items.filter((a) => ['asignada', 'confirmada', 'en_camino'].includes(String(a.status)));
  else if (s) items = items.filter((a) => String(s).split(',').includes(String(a.status)));
  return paginate(items, o.query);
});
on('GET', '/org/assignments/:id', (p) => {
  const a = db.assignments.find((x) => x.id === p.id);
  return a ? ok(a) : fail(404, 'Asignación no encontrada');
});
on('POST', '/org/assignments/:id/confirm', (p) => transition(p.id, ['asignada'], 'confirmada'));
on('POST', '/org/assignments/:id/start-transit', (p) =>
  transition(p.id, ['confirmada'], 'en_camino'),
);
on('POST', '/org/assignments/:id/complete', (p, o) => {
  const b = body(o);
  const errors: Record<string, string[]> = {};
  if (!b.picked_up_by_name) errors.picked_up_by_name = ['Indicá quién retiró.'];
  if (!b.picked_up_by_dni) errors.picked_up_by_dni = ['Indicá el DNI de quien retiró.'];
  if (Object.keys(errors).length) return fail(422, 'Datos inválidos', errors);
  return transition(p.id, ['asignada', 'confirmada', 'en_camino'], 'completada', {
    picked_up_by_name: b.picked_up_by_name,
    picked_up_by_dni: b.picked_up_by_dni,
    completion_notes: b.notes ?? null,
    completed_at: now(),
  });
});
on('POST', '/org/assignments/:id/cancel', (p, o) =>
  transition(p.id, ['asignada', 'confirmada', 'en_camino'], 'cancelada', {
    cancellation_reason: body(o).reason ?? null,
    cancelled_at: now(),
  }),
);
on('GET', '/org/families', (_, o) => {
  const q = o.query ?? {};
  if (q.source && !['manual', 'program_enrollment', 'all'].includes(String(q.source)))
    return fail(422, 'The selected source is invalid.', { source: ['The selected source is invalid.'] });
  // Sin source, el portal muestra sólo las familias de la organización (manual)
  let items = q.source === 'all' ? db.families : db.families.filter((f) => (q.source ?? 'manual') === (f.source ?? 'manual'));
  if (q.status) items = items.filter((f) => f.status === q.status);
  if (q.search) {
    const t = String(q.search).toLowerCase();
    items = items.filter((f) => f.name.toLowerCase().includes(t) || (f.code ?? '').toLowerCase().includes(t));
  }
  return paginate(items, { per_page: 25, ...q });
});
on('GET', '/org/families/demographics', () => {
  const members = db.families.flatMap((f) => f.members ?? []);
  const count = (fn: (m: (typeof members)[number]) => boolean) => members.filter(fn).length;
  const types = new Map<string, { name: string; code: string; count: number }>();
  for (const f of db.families) {
    if (!f.family_type) continue;
    const t = types.get(f.family_type.code ?? f.family_type.name) ?? { name: f.family_type.name, code: f.family_type.code ?? '', count: 0 };
    t.count++;
    types.set(t.code, t);
  }
  return ok({
    total_families: db.families.length,
    total_members: members.length,
    weighted_beneficiaries: members.reduce((a, m) => a + (m.nutritional_weight ?? 1), 0),
    family_types: [...types.values()],
    age_groups: {
      infants_0_2: count((m) => m.age_group === 'infants_0_2'),
      children_3_12: count((m) => m.age_group === 'children_3_12'),
      teens_13_17: count((m) => m.age_group === 'teens_13_17'),
      adults_18_64: count((m) => m.age_group === 'adults_18_64'),
      seniors_65_plus: count((m) => m.age_group === 'seniors_65_plus'),
    },
    special_conditions: {
      pregnant_women: count((m) => !!m.is_pregnant),
      nursing_mothers: count((m) => !!m.is_nursing_mother),
      diabetics: count((m) => !!m.is_diabetic),
      celiacs: count((m) => !!m.is_celiac),
      lactose_intolerant: count((m) => !!m.is_lactose_intolerant),
      disabled: count((m) => !!m.has_disability),
    },
  });
});
// ─── Alta y edición de familias (posts 5–7 de la API en GoDubi) ──────────────────────────
const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const findFamily = (familyId: string) => db.families.find((x) => x.id === familyId);
/** Otra persona de la organización con el mismo DNI (se compara sólo por los números) */
const dniTaken = (dni: unknown, exceptMemberId?: string) => {
  const d = digits(dni);
  if (!d) return null;
  for (const f of db.families)
    for (const m of f.members ?? [])
      if (m.id !== exceptMemberId && digits(m.document_number) === d) return f;
  return null;
};
const dniMessage = (f: Family) =>
  `Ya hay una persona con ese DNI en la organización (familia ${f.code ?? f.id}, ${f.name}).`;
const failCode = (status: number, message: string, error_code: string) =>
  json(status, { success: false, message, error_code });
/** Reglas comunes de edición: suspendida por el banco o cargada por un programa */
const notEditable = (f: Family) => {
  if (f.status === 'suspendida')
    return failCode(409, 'El banco suspendió esta familia. Para reactivarla o cambiarla, pedíselo al banco.', 'FAMILY_SUSPENDED_BY_BANK');
  if (f.source && f.source !== 'manual')
    return failCode(409, 'Esta familia la carga el banco por un programa: no se edita desde la app.', 'FAMILY_MANAGED_BY_BANK');
  return null;
};
const newMember = (familyId: string, m: Record<string, unknown>): FamilyMember => ({
  is_head_of_household: false,
  is_pregnant: false,
  is_nursing_mother: false,
  is_diabetic: false,
  is_celiac: false,
  is_lactose_intolerant: false,
  has_disability: false,
  document_type: m.document_number ? 'dni' : null,
  status: 'activo',
  nutritional_weight: 1,
  ...(m as Partial<FamilyMember>),
  id: randomUUID(),
  family_id: familyId,
  first_name: String(m.first_name),
  last_name: String(m.last_name),
  full_name: `${m.first_name} ${m.last_name}`,
});
const refreshHead = (f: Family) => {
  f.total_members = f.members?.length ?? 0;
  const h = f.members?.find((m) => m.is_head_of_household);
  f.head_of_household = h
    ? { id: h.id, full_name: h.full_name ?? `${h.first_name} ${h.last_name}`, document_number: h.document_number }
    : null;
};
/** Sólo se cambian los campos enviados. Un `null` o `''` borra el dato (así responde el servidor, G-15). */
const assignSent = (target: object, b: Record<string, unknown>) => {
  for (const [k, v] of Object.entries(b)) if (v !== undefined) (target as Record<string, unknown>)[k] = v === '' ? null : v;
};
/** Un solo referente por familia: al marcar uno nuevo, el servidor desmarca al anterior (G-15). */
const setHead = (f: Family, headId: string) => {
  for (const x of f.members ?? []) x.is_head_of_household = x.id === headId;
};

on('GET', '/org/family-types', () => ok(db.familyTypes));
on('GET', '/org/families/form-config', () =>
  ok({
    config: {
      required_fields: {
        housing_situation: { enabled: true, required: false },
        employment_level: { enabled: true, required: false },
        education_level: { enabled: true, required: false },
        email: { enabled: true, required: false },
      },
    },
    options: {
      housing_situations: ['propietario', 'alquilado', 'prestado', 'tomado', 'en_situacion_de_calle', 'otro'],
      family_statuses: ['activa', 'inactiva'],
      member_statuses: ['activo', 'inactivo'],
      genders: ['masculino', 'femenino', 'otro', 'no_especificado'],
      relationships: ['jefe_hogar', 'conyuge', 'hijo', 'padre_madre', 'abuelo', 'nieto', 'hermano', 'tio', 'sobrino', 'otro_familiar', 'no_familiar'],
      document_types: ['dni', 'pasaporte', 'otro'],
      employment_levels: ['empleado_formal', 'empleado_informal', 'desempleado', 'jubilado_pensionado', 'trabajo_domestico', 'otro'],
      education_levels: ['sin_instruccion', 'primario_incompleto', 'primario_completo', 'secundario_incompleto', 'secundario_completo', 'terciario_universitario', 'otro'],
    },
  }),
);
on('GET', '/org/families/members/search', (_, o) => {
  const d = digits(o.query?.document_number);
  if (!d) return fail(422, 'Indicá el DNI.', { document_number: ['Indicá el DNI.'] });
  for (const f of db.families)
    for (const m of f.members ?? [])
      if (digits(m.document_number) === d)
        return ok({
          found: true,
          member: {
            id: m.id,
            first_name: m.first_name,
            last_name: m.last_name,
            status: m.status,
            family: { id: f.id, name: f.name, code: f.code, source: f.source },
          },
        });
  return ok({ found: false });
});
on('POST', '/org/families', (_, o) => {
  const b = body(o);
  const errors: Record<string, string[]> = {};
  if (!b.name) errors.name = ['El nombre es obligatorio.'];
  if (!b.family_type_id) errors.family_type_id = ['Elegí el tipo de familia.'];
  const members = (b.members as Record<string, unknown>[] | undefined) ?? [];
  const seen = new Set<string>();
  members.forEach((m, i) => {
    if (!m.first_name) errors[`members.${i}.first_name`] = ['El nombre es obligatorio.'];
    if (!m.last_name) errors[`members.${i}.last_name`] = ['El apellido es obligatorio.'];
    const d = digits(m.document_number);
    const taken = dniTaken(m.document_number);
    if (taken) errors[`members.${i}.document_number`] = [dniMessage(taken)];
    else if (d && seen.has(d)) errors[`members.${i}.document_number`] = ['Ese DNI está repetido en la familia.'];
    if (d) seen.add(d);
  });
  if (Object.keys(errors).length) return fail(422, Object.values(errors)[0][0], errors);
  const familyId = randomUUID();
  const f: Family = {
    id: familyId,
    organization_id: ORG_ID,
    is_direct: false,
    source: 'manual',
    code: `FAM-${new Date().getFullYear()}-${String(db.families.length + 100).padStart(4, '0')}`,
    name: String(b.name),
    registration_date: now().slice(0, 10),
    phone: (b.phone as string) ?? null,
    email: (b.email as string) ?? null,
    status: 'activa',
    notes: (b.notes as string) ?? null,
    special_needs_notes: (b.special_needs_notes as string) ?? null,
    housing_situation: (b.housing_situation as string) ?? null,
    family_type: db.familyTypes.find((t) => t.id === b.family_type_id) ?? null,
    members: members.map((m) => newMember(familyId, m)),
  };
  refreshHead(f);
  db.families.push(f);
  return json(201, { success: true, message: 'Familia creada exitosamente', data: f });
});
on('PUT', '/org/families/:id', (p, o) => {
  const f = findFamily(p.id);
  if (!f) return failCode(404, 'Familia no encontrada', 'FAMILY_NOT_FOUND');
  const blocked = notEditable(f);
  if (blocked) return blocked;
  const b = body(o);
  if (b.status && !['activa', 'inactiva'].includes(String(b.status)))
    return fail(422, 'El estado no es válido.', { status: ['El estado no es válido.'] });
  assignSent(f, b);
  if (b.family_type_id) f.family_type = db.familyTypes.find((t) => t.id === b.family_type_id) ?? f.family_type;
  return json(200, { success: true, message: 'Familia actualizada exitosamente', data: f });
});
on('DELETE', '/org/families/:id', (p) => {
  const f = findFamily(p.id);
  if (!f) return failCode(404, 'Familia no encontrada', 'FAMILY_NOT_FOUND');
  const blocked = notEditable(f);
  if (blocked) return blocked;
  // En los mocks, las familias que venían cargadas "tienen entregas"; las dadas de alta acá se pueden borrar.
  if (f.code && Number(f.code.slice(-4)) < 100)
    return json(409, {
      success: false,
      message: 'No se puede borrar la familia porque tiene entregas registradas. Podés pasarla a inactiva.',
      errors: { reasons: ['tiene entregas registradas'] },
    });
  db.families = db.families.filter((x) => x.id !== f.id);
  return json(200, { success: true, message: 'Familia dada de baja' });
});
on('GET', '/org/families/:id/members', (p) => {
  const f = findFamily(p.id);
  return f ? ok(f.members ?? []) : failCode(404, 'Familia no encontrada', 'FAMILY_NOT_FOUND');
});
on('POST', '/org/families/:id/members', (p, o) => {
  const f = findFamily(p.id);
  if (!f) return failCode(404, 'Familia no encontrada', 'FAMILY_NOT_FOUND');
  const blocked = notEditable(f);
  if (blocked) return blocked;
  const b = body(o);
  const errors: Record<string, string[]> = {};
  if (!b.first_name) errors.first_name = ['El nombre es obligatorio.'];
  if (!b.last_name) errors.last_name = ['El apellido es obligatorio.'];
  const taken = dniTaken(b.document_number);
  if (taken) errors.document_number = [dniMessage(taken)];
  if (Object.keys(errors).length) return fail(422, Object.values(errors)[0][0], errors);
  const m = newMember(f.id, b);
  f.members = [...(f.members ?? []), m];
  if (m.is_head_of_household) setHead(f, m.id);
  refreshHead(f);
  return json(201, { success: true, message: 'Miembro agregado exitosamente', data: m });
});
on('PUT', '/org/families/:id/members/:member', (p, o) => {
  const f = findFamily(p.id);
  if (!f) return failCode(404, 'Familia no encontrada', 'FAMILY_NOT_FOUND');
  const blocked = notEditable(f);
  if (blocked) return blocked;
  const m = f.members?.find((x) => x.id === p.member);
  if (!m) return fail(404, 'Miembro no encontrado');
  const b = body(o);
  const taken = b.document_number ? dniTaken(b.document_number, m.id) : null;
  if (taken) return fail(422, dniMessage(taken), { document_number: [dniMessage(taken)] });
  assignSent(m, b);
  if (b.is_head_of_household === true) setHead(f, m.id);
  m.full_name = `${m.first_name} ${m.last_name}`;
  m.has_special_conditions = !!(
    m.is_pregnant || m.is_nursing_mother || m.is_diabetic || m.is_celiac || m.is_lactose_intolerant || m.has_disability
  );
  refreshHead(f);
  return json(200, { success: true, message: 'Miembro actualizado exitosamente', data: m });
});
on('DELETE', '/org/families/:id/members/:member', (p) => {
  const f = findFamily(p.id);
  if (!f) return failCode(404, 'Familia no encontrada', 'FAMILY_NOT_FOUND');
  const blocked = notEditable(f);
  if (blocked) return blocked;
  if (!f.members?.some((x) => x.id === p.member)) return fail(404, 'Miembro no encontrado');
  f.members = f.members.filter((x) => x.id !== p.member);
  refreshHead(f);
  return json(200, { success: true, message: 'Miembro quitado' });
});
on('GET', '/org/families/:id', (p) => {
  // Bug conocido: id no UUID → 500
  if (!/^[0-9a-f-]{36}$/i.test(p.id)) return fail(500, 'Error interno del servidor');
  const f = db.families.find((x) => x.id === p.id);
  return f ? ok(f) : fail(404, 'Ruta no encontrada');
});

// ─── Quién retira ──────────────────────────────────────────────────────────
on('GET', '/assignments/:id/eligible-contacts', () =>
  ok(
    db.contacts.map((c) => ({
      organization_contact_id: c.id,
      name: c.name,
      dni: c.dni,
      eligible: Boolean(c.dni),
      reason: c.dni ? null : 'No tiene DNI cargado',
    })),
  ),
);
on('GET', '/assignments/:id/pickers', (p) => ok(db.pickers[p.id] ?? []));
on('POST', '/assignments/:id/pickers', (p, o) => {
  const b = body(o);
  const contact = db.contacts.find((c) => c.id === b.organization_contact_id);
  if (!contact && !(b.name && b.dni))
    return fail(422, 'Elegí un contacto o completá nombre y DNI', {
      name: ['Completá nombre y DNI.'],
    });
  const picker = {
    id: `pk-${Date.now()}`,
    organization_contact_id: contact?.id ?? null,
    name: contact?.name ?? (b.name as string),
    dni: contact?.dni ?? (b.dni as string),
    declared_via: 'web',
    is_unlisted: !contact,
  };
  (db.pickers[p.id] ??= []).push(picker);
  return json(201, { success: true, data: picker });
});
on('DELETE', '/pickers/:id', (p) => {
  for (const list of Object.values(db.pickers)) {
    const i = list.findIndex((x) => x.id === p.id);
    if (i >= 0) list.splice(i, 1);
  }
  return ok(null);
});
// ─── Contactos: /org/contacts (docs/bda/04-contactos.md) ──────────────────
const onlyDigits = (v: unknown) => (typeof v === 'string' && v.trim() ? v.replace(/\D/g, '') : null);
const DNI_TAKEN = 'Ya hay un contacto de la organización con ese DNI.';
const contactDniTaken = (dni: string | null, exceptId?: string) =>
  !!dni && db.contacts.some((c) => c.dni === dni && c.id !== exceptId);
const setPrimary = (id: string) => db.contacts.forEach((c) => (c.is_primary = c.id === id));
on('GET', '/org/contacts', () => ok(db.contacts));
on('POST', '/org/contacts', (_, o) => {
  const b = body(o);
  if (!b.name) return fail(422, 'El nombre es obligatorio.', { name: ['El nombre es obligatorio.'] });
  const dni = onlyDigits(b.dni);
  if (contactDniTaken(dni)) return fail(422, DNI_TAKEN, { dni: [DNI_TAKEN] });
  const c = {
    id: randomUUID(),
    name: String(b.name),
    position: (b.position as string) ?? null,
    phone: (b.phone as string) ?? null,
    email: (b.email as string) ?? null,
    dni,
    is_primary: false,
    pickup_authorized: false,
    authorizations: [],
  };
  db.contacts.push(c);
  if (b.is_primary === true) setPrimary(c.id);
  return json(201, { success: true, message: 'Contacto agregado', data: c });
});
on('PUT', '/org/contacts/:id', (p, o) => {
  const c = db.contacts.find((x) => x.id === p.id);
  if (!c) return failCode(404, 'Contacto no encontrado', 'CONTACT_NOT_FOUND');
  const b = body(o);
  const dni = 'dni' in b ? onlyDigits(b.dni) : c.dni ?? null;
  if (c.pickup_authorized && (('name' in b && b.name !== c.name) || dni !== (c.dni ?? null)))
    return failCode(
      409,
      'Esta persona está autorizada por el banco para retirar: no se le puede cambiar el nombre ni el DNI. Si es otra persona, cargala como contacto nuevo y pedile al banco que la autorice.',
      'CONTACT_IDENTITY_LOCKED',
    );
  if (contactDniTaken(dni, c.id)) return fail(422, DNI_TAKEN, { dni: [DNI_TAKEN] });
  for (const k of ['name', 'position', 'phone', 'email'] as const) if (k in b) c[k] = (b[k] as string) ?? null;
  c.dni = dni;
  if (b.is_primary === true) setPrimary(c.id);
  else if (b.is_primary === false) c.is_primary = false;
  return json(200, { success: true, message: 'Contacto actualizado', data: c });
});
on('DELETE', '/org/contacts/:id', (p) => {
  const c = db.contacts.find((x) => x.id === p.id);
  if (!c) return failCode(404, 'Contacto no encontrado', 'CONTACT_NOT_FOUND');
  const assignmentIds = Object.entries(db.pickers)
    .filter(([, list]) => list.some((x) => x.organization_contact_id === c.id))
    .map(([assignmentId]) => assignmentId);
  if (assignmentIds.length)
    return json(409, {
      success: false,
      message: 'Esta persona está declarada para retirar una merma en curso. Dala de baja de ese retiro primero.',
      error_code: 'CONTACT_DECLARED_FOR_PICKUP',
      details: { assignment_ids: assignmentIds },
    });
  db.contacts = db.contacts.filter((x) => x.id !== c.id);
  return json(200, { success: true, message: 'Contacto dado de baja' });
});

// ─── Nutrición ─────────────────────────────────────────────────────────────
on('GET', '/nutritional-groups', () => ok(db.nutritionalGroups));
on('GET', '/nutrition/merma/:id/summary', (p) => {
  const m = db.mermas.find((x) => x.id === p.id);
  if (!m) return fail(404, 'Merma no encontrada');
  const byGroup: Record<string, number> = {};
  for (const prod of m.products ?? []) {
    const kg = prod.unit === 'kg' ? prod.quantity : prod.quantity * (prod.weight_per_unit_kg ?? 1);
    const g = String(prod.nutritional_group ?? 'otros');
    byGroup[g] = (byGroup[g] ?? 0) + kg;
  }
  return ok({
    total_kg: Object.values(byGroup).reduce((a, b) => a + b, 0),
    groups: Object.entries(byGroup).map(([code, kg]) => ({ code, total_kg: kg })),
  });
});
on('GET', '/unified-products/search', (_, o) => {
  const q = String(o.query?.q ?? '').toLowerCase();
  const all = db.mermas.flatMap((m) => m.products ?? []);
  return ok(
    all
      .filter((p) => p.name.toLowerCase().includes(q))
      .map((p) => ({
        id: p.id,
        name: p.name,
        default_unit: p.unit,
        nutritional_group: { code: p.nutritional_group ?? undefined },
        source: 'mock',
        nutriments: { 'energy-kcal_100g': 52, proteins_100g: 0.3, carbohydrates_100g: 14, fat_100g: 0.2 },
      })),
  );
});

// ─── Interacciones con el banco (formas de docs/bda/08) ─────────────────
const INTERACTION_TYPES = ['suceso', 'solicitud', 'consulta', 'reclamo'];
const INTERACTION_LABELS: Record<string, string> = { suceso: 'Suceso', solicitud: 'Solicitud', consulta: 'Consulta', reclamo: 'Reclamo' };
on('GET', '/org/interactions', (_, o) => {
  const q = o.query ?? {};
  let items = db.interactions;
  if (q.type) items = items.filter((i) => i.interaction_type === q.type);
  if (q.status) items = items.filter((i) => i.status === q.status);
  return paginate(items, { ...q, per_page: q.per_page ?? 20 });
});
on('GET', '/org/interactions/summary', () => {
  const by_type = Object.fromEntries(
    INTERACTION_TYPES.map((t) => {
      const of = db.interactions.filter((i) => i.interaction_type === t);
      return [t, { total: of.length, pendientes: of.filter((i) => i.status === 'pendiente').length }];
    }),
  );
  const months = new Map<string, number>();
  db.interactions.forEach((i) => {
    const m = String(i.created_at).slice(0, 7);
    months.set(m, (months.get(m) ?? 0) + 1);
  });
  return ok({
    total: db.interactions.length,
    pendientes: db.interactions.filter((i) => i.status === 'pendiente').length,
    by_type,
    by_month: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total })),
  });
});
on('GET', '/org/interactions/:id', (p) => {
  const i = db.interactions.find((x) => x.id === p.id);
  return i ? ok(i) : fail(404, 'Interacción no encontrada');
});
on('POST', '/org/interactions', (_, o) => {
  const b = body(o);
  const errors: Record<string, string[]> = {};
  if (!INTERACTION_TYPES.includes(String(b.interaction_type)))
    errors.interaction_type = ['El tipo debe ser suceso, solicitud, consulta o reclamo.'];
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title) errors.title = ['El título es obligatorio.'];
  else if (title.length > 255) errors.title = ['El título no puede tener más de 255 caracteres.'];
  if (typeof b.notes === 'string' && b.notes.length > 5000)
    errors.notes = ['El detalle no puede tener más de 5000 caracteres.'];
  if (Object.keys(errors).length) return fail(422, Object.values(errors)[0][0], errors);
  const created = {
    id: (globalThis.crypto?.randomUUID?.() ?? `5d7a2f4c-${Date.now().toString(16).slice(-4)}-4000-8000-${String(Date.now()).slice(-12)}`),
    interaction_type: String(b.interaction_type),
    type_label: INTERACTION_LABELS[String(b.interaction_type)],
    title,
    notes: typeof b.notes === 'string' && b.notes ? b.notes : null,
    status: 'pendiente',
    attended_at: null,
    created_by: { id: 'e2e1ba9d-852a-4cc7-89e5-3ca84e1c5598', name: `${db.me.first_name} ${db.me.last_name ?? ''}`.trim() },
    created_at: now(),
  };
  db.interactions.unshift(created);
  return json(201, { success: true, message: 'Interacción enviada al banco', data: created });
});

// ─── Pedidos de mercadería (reglas de docs/bda/09-10-pedidos-mercaderia.md) ─────
const WAITING = ['pendiente', 'en_revision'];
const OPEN = ['pendiente', 'en_revision', 'aprobada', 'programada', 'en_preparacion', 'lista_para_retiro'];
const businessError = (status: number, message: string, error_code: string) =>
  json(status, { success: false, message, error_code });
const round2 = (n: number) => Math.round(n * 100) / 100;

on('GET', '/org/catalog', (_, o) => {
  let items = db.catalog;
  const q = String(o.query?.search ?? '').toLowerCase();
  if (q) items = items.filter((p) => p.name.toLowerCase().includes(q));
  if (o.query?.food_category_id) items = items.filter((p) => p.category?.id === o.query?.food_category_id);
  return paginate(items, o.query);
});
on('GET', '/org/quota', () => ok(db.quota));
on('GET', '/org/distributions', (_, o) => {
  let items = db.distributions;
  const s = o.query?.status;
  if (s === 'abiertos') items = items.filter((d) => OPEN.includes(String(d.status)));
  else if (s) items = items.filter((d) => d.status === s);
  // El listado no trae `items` (sólo el detalle)
  return paginate(items.map(({ items: _items, ...d }) => d), { per_page: 20, ...o.query });
});
on('GET', '/org/distributions/:id', (p) => {
  const d = db.distributions.find((x) => x.id === p.id);
  return d ? ok(d) : fail(404, 'Pedido no encontrado');
});
on('POST', '/org/distributions', (_, o) => {
  const b = body(o) as { requested_distribution_date?: string; time_slot?: string | null; notes?: string | null; is_urgent?: boolean; urgency_reason?: string | null; items?: { product_id: string; quantity_requested: number }[] };
  const errors: Record<string, string[]> = {};
  const today = new Date().toISOString().slice(0, 10);
  if (!b.requested_distribution_date) errors.requested_distribution_date = ['La fecha de retiro es obligatoria.'];
  else if (b.requested_distribution_date < today) errors.requested_distribution_date = ['La fecha de retiro no puede ser anterior a hoy.'];
  const items = b.items ?? [];
  if (!items.length) errors.items = ['Agregá al menos un producto.'];
  if (items.length > 30) errors.items = ['Un pedido puede tener hasta 30 productos.'];
  const seen = new Set<string>();
  items.forEach((it, i) => {
    if (!db.catalog.some((p) => p.product_id === it.product_id)) errors[`items.${i}.product_id`] = ['El producto no existe o no está disponible.'];
    if (seen.has(it.product_id)) errors[`items.${i}.product_id`] = ['El producto está repetido en el pedido.'];
    seen.add(it.product_id);
    if (!(it.quantity_requested > 0)) errors[`items.${i}.quantity_requested`] = ['La cantidad tiene que ser mayor a cero.'];
  });
  const keys = Object.keys(errors);
  if (keys.length) {
    const first = errors[keys[0]][0];
    return fail(422, keys.length > 1 ? `${first} (and ${keys.length - 1} more errors)` : first, errors);
  }
  if (db.distributions.filter((d) => WAITING.includes(String(d.status))).length >= 3) {
    return businessError(422, 'Ya tenés 3 pedidos esperando respuesta del banco. Esperá a que los revisen o cancelá alguno.', 'TOO_MANY_OPEN_REQUESTS');
  }

  const warnings: { code: string; field: string | null; message: string }[] = [];
  const lines = items.map((it, i) => {
    const p = db.catalog.find((x) => x.product_id === it.product_id)!;
    // En los mocks, "poco stock" = más de 20 unidades no alcanzan
    if (p.availability === 'poco_stock' && it.quantity_requested > 20) {
      warnings.push({ code: 'STOCK_INSUFFICIENT', field: `items.${i}.quantity_requested`, message: `Puede que no haya todo lo que pediste de "${p.name}": el banco lo ajusta al aprobar.` });
    }
    return {
      id: `d1b00000-${Date.now().toString(16).slice(-4)}-4000-8000-${String(Date.now() + i).slice(-12)}`,
      product: { id: p.product_id, name: p.name, brand: p.brand ?? null },
      unit: p.unit,
      weight_per_unit_kg: p.weight_per_unit_kg,
      quantity_requested: it.quantity_requested,
      quantity_approved: null,
      quantity_delivered: null,
      kg_requested: round2(it.quantity_requested * (p.weight_per_unit_kg ?? 0)),
    };
  });
  const totalKg = round2(lines.reduce((acc, l) => acc + l.kg_requested, 0));
  db.quota.requested_in_progress_kg = round2(db.quota.requested_in_progress_kg + totalKg);
  db.quota.remaining_kg = round2(db.quota.monthly_quota_kg - db.quota.delivered_kg - db.quota.requested_in_progress_kg);
  if (db.quota.remaining_kg < 0) {
    warnings.push({ code: 'QUOTA_EXCEEDED', field: null, message: `Con este pedido se pasan del cupo del mes (${db.quota.monthly_quota_kg} kg) por ${formatNumber(-db.quota.remaining_kg)} kg.` });
  }
  const n = 50 + db.distributions.length;
  const d = {
    id: `d1a00000-${Date.now().toString(16).slice(-4)}-4000-8000-${String(Date.now()).slice(-12)}`,
    number: `DIST-2026-${String(n).padStart(5, '0')}`,
    status: 'pendiente',
    status_label: 'Pendiente de revisión',
    request_date: today,
    requested_distribution_date: b.requested_distribution_date!,
    scheduled_distribution_date: null,
    actual_distribution_date: null,
    time_slot: b.time_slot ?? null,
    pickup_type: 'pickup',
    total_items: lines.length,
    total_kg: totalKg,
    is_urgent: !!b.is_urgent,
    urgency_reason: b.urgency_reason ?? null,
    notes: b.notes ?? null,
    rejection_reason: null,
    received_by_name: null,
    receipt_number: null,
    can_cancel: true,
    receipt_available: false,
    requested_by_organization: true,
    created_at: now(),
    updated_at: now(),
    items: lines,
  };
  db.distributions.unshift(d);
  return json(201, { success: true, message: 'Pedido enviado al banco', data: d, warnings, quota: db.quota });
});
on('POST', '/org/distributions/:id/cancel', (p, o) => {
  const d = db.distributions.find((x) => x.id === p.id);
  if (!d) return fail(404, 'Pedido no encontrado');
  const reason = String(body(o).reason ?? '').trim();
  if (!reason) return fail(422, 'Contanos por qué lo cancelás.', { reason: ['El motivo es obligatorio.'] });
  if (!WAITING.includes(String(d.status))) {
    return businessError(409, `El pedido ya está ${String(d.status_label ?? d.status).toLowerCase()}: pedile al banco que lo cancele.`, 'DISTRIBUTION_NOT_CANCELLABLE');
  }
  db.quota.requested_in_progress_kg = round2(Math.max(0, db.quota.requested_in_progress_kg - (d.total_kg ?? 0)));
  db.quota.remaining_kg = round2(db.quota.monthly_quota_kg - db.quota.delivered_kg - db.quota.requested_in_progress_kg);
  Object.assign(d, { status: 'cancelada', status_label: 'Cancelado', rejection_reason: `Cancelado por la organización: ${reason}`, can_cancel: false, updated_at: now() });
  return json(200, { success: true, message: 'Pedido cancelado', data: d });
});
on('GET', '/org/distributions/:id/receipt', (p) => {
  const d = db.distributions.find((x) => x.id === p.id);
  if (!d) return fail(404, 'Pedido no encontrado');
  if (!d.receipt_available) return fail(422, 'El remito está disponible desde que el pedido está listo para retirar.');
  // PDF mínimo de una página (sólo web: en nativo la descarga va directo al servidor)
  const pdf = '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';
  return new Response(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf' } });
});

// ─── Lo recibido y panel nutricional (docs/bda/11-recibido-nutricion.md) ─────
// Se arman con lo que ya está en los mocks: pedidos entregados y retiros de merma completados.
interface ReceivedLine {
  name: string;
  quantity: number;
  unit: string;
  kg: number;
  group: string | null;
}
interface ReceivedEntry {
  kind: 'distribution' | 'merma';
  id: string;
  date: string;
  number: string;
  receipt_number: string | null;
  lines: ReceivedLine[];
}
/** Grupo por categoría para los productos del catálogo que no traen `nutritional_group` */
const GROUP_BY_CATEGORY: Record<string, string> = {
  'cat-cereales': 'cereales',
  'cat-lacteos': 'lacteos',
  'cat-aceites': 'aceites',
  'cat-frutas-verduras': 'frutas_verduras',
};
/** Necesidad de cada grupo como parte del cupo mensual (proporciones del ejemplo del post 11) */
const GROUP_NEEDS = [
  { code: 'cereales', name: 'Cereales', color: null, share: 0.3 },
  { code: 'frutas_verduras', name: 'Frutas verduras', color: null, share: 0.35 },
  { code: 'lacteos', name: 'Lacteos', color: '#4CAF50', share: 0.12 },
  { code: 'proteinas', name: 'Proteinas animales', color: '#4CAF50', share: 0.15 },
  { code: 'aceites', name: 'Aceites', color: null, share: 0.08 },
];
const round1 = (n: number) => Math.round(n * 10) / 10;
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function receivedEntries(): ReceivedEntry[] {
  const fromOrders: ReceivedEntry[] = db.distributions
    .filter((d) => d.status === 'distribuida' && d.actual_distribution_date)
    .map((d) => ({
      kind: 'distribution',
      id: d.id,
      date: d.actual_distribution_date!,
      number: d.number,
      receipt_number: d.receipt_number ?? null,
      lines: (d.items ?? []).map((it) => {
        const p = db.catalog.find((x) => x.product_id === it.product.id);
        const quantity = it.quantity_delivered ?? it.quantity_approved ?? it.quantity_requested;
        return {
          name: it.product.name,
          quantity,
          unit: it.unit,
          kg: round2(quantity * (it.weight_per_unit_kg ?? 1)),
          group: p?.nutritional_group?.code ?? (p?.category ? GROUP_BY_CATEGORY[p.category.id] : undefined) ?? null,
        };
      }),
    }));
  const fromMermas: ReceivedEntry[] = db.assignments
    .filter((a) => a.status === 'completada' && a.completed_at)
    .map((a) => {
      const date = String(a.completed_at).slice(0, 10);
      return {
        kind: 'merma',
        id: a.id,
        date,
        number: `MRM-${date.replace(/-/g, '')}-0001`,
        receipt_number: null,
        lines: (a.products ?? []).map((ap) => {
          const mp = db.mermas.flatMap((m) => m.products ?? []).find((x) => x.id === ap.merma_product_id);
          const quantity = ap.quantity_received ?? ap.quantity_assigned;
          const unit = ap.unit ?? mp?.unit ?? 'kg';
          return {
            name: ap.name ?? mp?.name ?? 'Producto',
            quantity,
            unit,
            kg: round2(unit === 'kg' ? quantity : quantity * (mp?.weight_per_unit_kg ?? 1)),
            // Sin grupo cargado → cuenta como "sin clasificar", como en el servidor
            group: (mp?.nutritional_group as string | null | undefined) ?? null,
          };
        }),
      };
    });
  return [...fromOrders, ...fromMermas].sort((x, y) => y.date.localeCompare(x.date));
}
const entryKg = (e: ReceivedEntry) => round2(e.lines.reduce((acc, l) => acc + l.kg, 0));

on('GET', '/org/received', (_, o) => {
  const q = o.query ?? {};
  const today = new Date();
  const from = q.from ? String(q.from) : isoDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90));
  const to = q.to ? String(q.to) : isoDay(today);
  if (!DATE_RE.test(from)) return fail(422, 'La fecha "desde" no es válida.', { from: ['La fecha "desde" no es válida.'] });
  if (!DATE_RE.test(to)) return fail(422, 'La fecha "hasta" no es válida.', { to: ['La fecha "hasta" no es válida.'] });
  if (to < from) {
    const m = 'La fecha "hasta" no puede ser anterior a la fecha "desde".';
    return fail(422, m, { to: [m] });
  }
  if ((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000 > 366) {
    const m = 'El período puede ser de hasta un año.';
    return fail(422, m, { from: [m] });
  }
  if (q.kind && !['distribution', 'merma'].includes(String(q.kind))) {
    return fail(422, 'El tipo elegido no es válido.', { kind: ['El tipo elegido no es válido.'] });
  }
  const entries = receivedEntries().filter(
    (e) => e.date >= from && e.date <= to && (!q.kind || e.kind === q.kind),
  );

  const byKind: Record<string, { count: number; kg: number }> = {};
  const byMonth: Record<string, { count: number; kg: number }> = {};
  for (const e of entries) {
    const kg = entryKg(e);
    const k = (byKind[e.kind] ??= { count: 0, kg: 0 });
    k.count++;
    k.kg = round2(k.kg + kg);
    const m = (byMonth[e.date.slice(0, 7)] ??= { count: 0, kg: 0 });
    m.count++;
    m.kg = round2(m.kg + kg);
  }
  const summary = {
    period: { from, to },
    total_count: entries.length,
    total_kg: round2(entries.reduce((acc, e) => acc + entryKg(e), 0)),
    by_kind: byKind,
    by_month: Object.entries(byMonth)
      .sort(([x], [y]) => x.localeCompare(y))
      .map(([month, v]) => ({ month, ...v })),
    last_received_date: entries[0]?.date ?? null,
  };

  const perPage = Number(q.per_page ?? 20);
  const page = Number(q.page ?? 1);
  const items = entries.slice((page - 1) * perPage, page * perPage).map((e) => ({
    key: `${e.kind}:${e.id}`,
    kind: e.kind,
    id: e.id,
    date: e.date,
    number: e.number,
    kg: entryKg(e),
    items_count: e.lines.length,
    items_preview: e.lines.slice(0, 3).map(({ name, quantity, unit, kg }) => ({ name, quantity, unit, kg })),
    more_items: Math.max(0, e.lines.length - 3),
    origin:
      e.kind === 'merma'
        ? { tag: 'merma', label: 'Rescate de merma' }
        : { tag: 'inventario', label: 'Pedido al banco' },
    receipt_number: e.receipt_number,
    detail_path: e.kind === 'merma' ? `/api/org/assignments/${e.id}` : `/api/org/distributions/${e.id}`,
  }));
  // `data` = { summary, items }; la paginación va en `meta`, afuera de `data` (como en el servidor)
  return json(200, {
    success: true,
    data: { summary, items },
    meta: {
      current_page: page,
      last_page: Math.max(1, Math.ceil(entries.length / perPage)),
      per_page: perPage,
      total: entries.length,
    },
  });
});

on('GET', '/org/nutrition', (_, o) => {
  const month = o.query?.month ? String(o.query.month) : isoDay(new Date()).slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    const m = 'El mes tiene que tener el formato AAAA-MM.';
    return fail(422, m, { month: [m] });
  }
  const [y, mo] = month.split('-').map(Number);
  const from = `${month}-01`;
  const to = isoDay(new Date(y, mo, 0));
  const entries = receivedEntries().filter((e) => e.date >= from && e.date <= to);
  const lines = entries.flatMap((e) => e.lines);
  const quota = db.organization.monthly_quota_kg ?? 0;
  const sumKg = (ls: ReceivedLine[]) => round2(ls.reduce((acc, l) => acc + l.kg, 0));

  const groups = GROUP_NEEDS.map((g) => {
    const received = sumKg(lines.filter((l) => l.group === g.code));
    const need = round2(quota * g.share);
    return {
      code: g.code,
      name: g.name,
      color: g.color,
      received_kg: received,
      quota_kg: need,
      coverage_pct: need ? round1((received / need) * 100) : null,
    };
  });
  const totalKg = sumKg(lines);
  const kindKg = (kind: string) => sumKg(entries.filter((e) => e.kind === kind).flatMap((e) => e.lines));
  return ok({
    period: { from, to, months: 1 },
    beneficiaries: {
      total_beneficiaries: db.organization.total_beneficiaries ?? null,
      services_per_day: db.organization.services_per_day ?? null,
      organization_type: db.organization.organization_type ?? null,
    },
    groups,
    unclassified_kg: sumKg(lines.filter((l) => !l.group)),
    bulk_kg: 0,
    totals: { received_kg: totalKg, quota_kg: quota, coverage_pct: quota ? round1((totalKg / quota) * 100) : null },
    sources: { distributions_kg: kindKg('distribution'), mermas_kg: kindKg('merma') },
    needs_available: true,
  });
});

// ─── Notificaciones (formas de docs/bda/03: paginación anidada) ──────────
const unreadCount = () => db.notifications.filter((n) => !n.is_read).length;
on('GET', '/notifications', (_, o) => {
  let items = db.notifications;
  if (o.query?.unread === 'true') items = items.filter((n) => !n.is_read);
  const perPage = Number(o.query?.per_page ?? 20);
  const page = Number(o.query?.page ?? 1);
  return ok({
    data: items.slice((page - 1) * perPage, page * perPage),
    meta: {
      current_page: page,
      last_page: Math.max(1, Math.ceil(items.length / perPage)),
      per_page: perPage,
      total: items.length,
      unread_count: unreadCount(),
    },
  });
});
on('GET', '/notifications/unread-count', () => ok({ count: unreadCount() }));
on('POST', '/notifications/test', () => {
  const n = {
    id: `a2dd8761-${Date.now().toString(16).padStart(4, '0').slice(-4)}-4000-8000-${String(Date.now()).slice(-12)}`,
    type: 'sistema',
    title: 'Notificación de Prueba',
    body: '¡Las notificaciones están funcionando correctamente!',
    data: { test: true },
    action_url: '/notifications',
    icon: '/icons/notification-default.png',
    is_read: false,
    read_at: null,
    created_at: now(),
  };
  db.notifications.unshift(n);
  return ok({ message: 'Notificación de prueba enviada', notification: n });
});
on('POST', '/notifications/read-all', () => {
  let marked = 0;
  db.notifications.forEach((n) => {
    if (!n.is_read) {
      n.is_read = true;
      n.read_at = now();
      marked++;
    }
  });
  return ok({ marked_count: marked, unread_count: 0 });
});
on('POST', '/notifications/:id/read', (p) => {
  const n = db.notifications.find((x) => x.id === p.id);
  if (!n) return fail(404, 'Notificación no encontrada');
  n.is_read = true;
  n.read_at ??= now();
  return ok(n);
});
on('DELETE', '/notifications', () => {
  const deleted = db.notifications.length;
  db.notifications = [];
  return ok({ deleted_count: deleted, unread_count: 0 });
});
on('DELETE', '/notifications/:id', (p) => {
  if (!db.notifications.some((n) => n.id === p.id)) return fail(404, 'Notificación no encontrada');
  db.notifications = db.notifications.filter((n) => n.id !== p.id);
  return ok({ message: 'Notificación eliminada', unread_count: unreadCount() });
});
on('POST', '/notifications/subscribe', () =>
  // Bug conocido: HTTP 200 con message "201"
  json(200, { success: true, message: '201', data: { message: 'Suscripción registrada', subscription_id: 'a2dd8766-0000-4000-8000-000000000001' } }),
);
on('POST', '/notifications/unsubscribe', () => ok({ message: 'Suscripción cancelada' }));

// ─── Organización: jornadas ─────────────────────────
on('GET', '/organizations/:org/collection-commitments', () =>
  ok({ year: new Date().getFullYear(), scheduled: 4, attended: 3, no_show: 1 }),
);
on('GET', '/programs', (_, o) => paginate(db.programs, o.query));
on('GET', '/programs/:id/trainings', (p, o) => paginate(db.trainings[p.id] ?? [], o.query));
on('GET', '/collection-sessions', (_, o) => paginate(db.sessions, o.query));
on('PUT', '/collection-sessions/:id/confirm', (p) => {
  const s = db.sessions.find((x) => x.id === p.id);
  if (!s) return fail(404, 'Jornada no encontrada');
  s.status = 'confirmada';
  return ok(s);
});

// ─── Entrada ───────────────────────────────────────────────────────────────
export async function mockHandler(
  method: HttpMethod,
  path: string,
  opts: RequestOptions,
): Promise<Response> {
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 350));
  const cleanPath = path.split('?')[0];

  const isPublic = cleanPath === '/health' || cleanPath === '/auth/login';
  if (!isPublic && opts.auth !== false) {
    if (!apiConfig.getToken()) return fail(401, 'No autenticado');
  }
  if (method === 'POST' && !isPublic && !opts.idempotencyKey && !cleanPath.startsWith('/auth/')) {
    return json(400, { success: false, code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Falta Idempotency-Key' });
  }
  const cacheKey = opts.idempotencyKey ? `${method} ${cleanPath} ${opts.idempotencyKey}` : null;
  if (cacheKey && idempotencyCache.has(cacheKey)) {
    return json(200, idempotencyCache.get(cacheKey));
  }

  for (const [m, re, names, handler] of routes) {
    if (m !== method) continue;
    const match = re.exec(cleanPath);
    if (!match) continue;
    const params: Params = {};
    names.forEach((n, i) => (params[n] = decodeURIComponent(match[i + 1])));
    const res = handler(params, opts);
    if (cacheKey && res.ok) {
      idempotencyCache.set(cacheKey, await res.clone().json());
    }
    return res;
  }
  return fail(404, 'Ruta no encontrada');
}
