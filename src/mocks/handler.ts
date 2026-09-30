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

// ─── Sistema / auth ─────────────────────────────────────────────────────────
on('GET', '/health', () => json(200, { status: 'ok', timestamp: now(), version: '4.0.0 (mock)' }));
on('GET', '/capabilities', () =>
  ok({ modules: ['org_portal', 'notifications', 'nutrition'], permissions: db.me.permissions }),
);
on('POST', '/auth/login', (_, o) => {
  const b = body(o);
  const errors: Record<string, string[]> = {};
  if (!b.email) errors.email = ['El email es obligatorio.'];
  if (!b.password) errors.password = ['La contraseña es obligatoria.'];
  if (Object.keys(errors).length) return fail(422, 'Datos inválidos', errors);
  if (b.password === 'incorrecta') return fail(401, 'Credenciales inválidas');
  return ok({ token: MOCK_TOKEN, user: db.me });
});
on('POST', '/auth/logout', () => ok(null));
on('POST', '/auth/refresh', () => ok({ token: MOCK_TOKEN }));
on('GET', '/auth/me', () => ok(db.me));
on('PUT', '/auth/profile', (_, o) => {
  Object.assign(db.me, body(o));
  return ok(db.me);
});
on('PUT', '/auth/password', (_, o) => {
  const b = body(o);
  if (b.current_password === 'incorrecta')
    return fail(422, 'La contraseña actual no es correcta', {
      current_password: ['La contraseña actual no es correcta.'],
    });
  return ok(null);
});

// ─── Portal Organización ───────────────────────────────────────────────────
on('GET', '/org/profile', () => ok(db.organization));
on('GET', '/org/stats', () =>
  ok({
    total_applications: db.applications.length,
    pending_applications: db.applications.filter((a) => a.status === 'pendiente').length,
    completed_assignments: db.assignments.filter((a) => a.status === 'completada').length,
    total_kg_received: 30,
  }),
);
on('PUT', '/org/address', (_, o) => {
  const b = body(o);
  db.organization.address = [b.street, b.street_number].filter(Boolean).join(' ');
  db.organization.city = (b.city as string) ?? db.organization.city;
  return ok(db.organization);
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
    message: `${merma.title}: el Banco lo va a revisar.`,
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
on('GET', '/org/families', (_, o) => paginate(db.families, o.query));
on('GET', '/org/families/demographics', () => {
  const members = db.families.flatMap((f) => f.members ?? []);
  return ok({
    total_families: db.families.length,
    total_members: members.length,
    children: members.filter((m) => m.relationship === 'hijo').length,
    celiac: members.filter((m) => m.is_celiac).length,
    diabetic: members.filter((m) => m.is_diabetic).length,
  });
});
on('GET', '/org/families/:id', (p) => {
  const f = db.families.find((x) => x.id === p.id);
  return f ? ok(f) : fail(404, 'Familia no encontrada');
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

// ─── Notificaciones ────────────────────────────────────────────────────────
on('GET', '/notifications', (_, o) => {
  let items = db.notifications;
  if (o.query?.unread === 'true') items = items.filter((n) => !n.read_at);
  return paginate(items, o.query);
});
on('GET', '/notifications/unread-count', () =>
  ok({ count: db.notifications.filter((n) => !n.read_at).length }),
);
on('POST', '/notifications/read-all', () => {
  db.notifications.forEach((n) => (n.read_at ??= now()));
  return ok(null);
});
on('POST', '/notifications/:id/read', (p) => {
  const n = db.notifications.find((x) => x.id === p.id);
  if (n) n.read_at ??= now();
  return ok(n ?? null);
});
on('DELETE', '/notifications', () => {
  db.notifications = [];
  return ok(null);
});
on('DELETE', '/notifications/:id', (p) => {
  db.notifications = db.notifications.filter((n) => n.id !== p.id);
  return ok(null);
});
on('POST', '/notifications/subscribe', () => ok(null));
on('POST', '/notifications/unsubscribe', () => ok(null));

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
  return fail(404, `Mock sin ruta: ${method} ${cleanPath}`);
}
