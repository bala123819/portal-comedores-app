/**
 * Router de mocks: responde como la API Mermab (envoltorio, meta, 401/404/422, transiciones de
 * estado solo por acción, Idempotency-Key obligatoria en POST).
 */
import { apiConfig, type HttpMethod, type RequestOptions } from '@/services/api/client';
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
  let items = db.families;
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
on('GET', '/organizations/:org/contacts', () => ok(db.contacts));
on('POST', '/organizations/:org/contacts', (_, o) => {
  const b = body(o);
  if (!b.name) return fail(422, 'Datos inválidos', { name: ['El nombre es obligatorio.'] });
  const c = { id: `c-${Date.now()}`, name: String(b.name), dni: (b.dni as string) ?? null, phone: (b.phone as string) ?? null, position: (b.position as string) ?? null, is_primary: false };
  db.contacts.push(c);
  return json(201, { success: true, data: c });
});
on('GET', '/organizations/:org/contacts/:c/pickup-authorizations', () => ok([]));
on('POST', '/organizations/:org/contacts/:c/pickup-authorizations', (_, o) =>
  json(201, { success: true, data: { id: `pa-${Date.now()}`, ...body(o) } }),
);
on('DELETE', '/pickup-authorizations/:id', () => ok(null));

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
on('GET', '/nutrition/summary', () =>
  ok({
    total_kg: 215,
    groups: [
      { code: 'frutas_verduras', total_kg: 110 },
      { code: 'cereales', total_kg: 60 },
      { code: 'proteinas', total_kg: 30 },
      { code: 'lacteos', total_kg: 15 },
    ],
  }),
);
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

// ─── Organización: documentos, familias, jornadas ─────────────────────────
on('GET', '/organizations/:org/requirements', () => ok(db.requirements));
on('GET', '/organizations/:org/documents', () =>
  ok([{ id: 'doc-1', document_type: 'personeria_juridica', document_name: 'Personería 2024.pdf', created_at: now() }]),
);
on('GET', '/organizations/:org/social-data', () =>
  ok({
    organization_fields: {
      fantasy_name: 'Los Girasoles',
      founding_year: 2009,
      delivers_viandas: true,
      water_source: 'red_publica',
      has_bathroom: true,
      cooking_sources: ['gas_envasado'],
      property_ownership: 'comodato',
      storage_methods: ['estante', 'heladera', 'freezer'],
    },
  }),
);
on('GET', '/organizations/:org/terms-pdf', () => fail(404, 'La carta compromiso todavía no fue aceptada'));
on('GET', '/organizations/:org/collection-commitments', () =>
  ok({ year: new Date().getFullYear(), scheduled: 4, attended: 3, no_show: 1 }),
);
on('GET', '/family-types', () => ok(db.familyTypes));
on('POST', '/organizations/:org/families', (_, o) => {
  const b = body(o);
  const errors: Record<string, string[]> = {};
  if (!b.name) errors.name = ['El nombre es obligatorio.'];
  if (!b.family_type_id) errors.family_type_id = ['Elegí el tipo de familia.'];
  if (Object.keys(errors).length) return fail(422, 'Datos inválidos', errors);
  const members = ((b.members as Record<string, unknown>[] | undefined) ?? []).map((m, i) => ({
    id: `fm-${Date.now()}-${i}`,
    first_name: String(m.first_name),
    last_name: String(m.last_name),
    ...m,
  }));
  const f = { id: `fam-${Date.now()}`, name: String(b.name), status: 'activa', members };
  db.families.push(f);
  return json(201, { success: true, data: f });
});
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
