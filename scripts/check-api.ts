/// <reference types="node" />
/**
 * npm run check:api — verificación de conexión con la API Mermab (checklist de llms.txt
 * adaptado a auth Bearer de Sanctum). Credenciales SOLO desde .env (CHECK_API_EMAIL /
 * CHECK_API_PASSWORD), nunca en el repo ni en el bundle.
 *
 * Además de verificar, guarda respuestas de ejemplo con datos personales enmascarados en
 * docs/api/samples/ para relevar la forma real de las respuestas (el spec no las documenta, G-01).
 * Con --probe prueba también los endpoints fuera de /org/* para relevar permisos (G-02).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { maskPersonalData } from '../src/lib/mask';

const ROOT = join(__dirname, '..');
if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));

const BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://cloud.mermab.com/api').replace(/\/$/, '');
const EMAIL = process.env.CHECK_API_EMAIL;
const PASSWORD = process.env.CHECK_API_PASSWORD;
const PROBE = process.argv.includes('--probe');
const SAMPLES = join(ROOT, 'docs/api/samples');

let token: string | null = null;
let failures = 0;

async function call(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 200);
  }
  return { status: res.status, json, retryAfter: res.headers.get('retry-after') };
}

function save(name: string, data: unknown) {
  mkdirSync(SAMPLES, { recursive: true });
  writeFileSync(join(SAMPLES, `${name}.json`), JSON.stringify(maskPersonalData(data), null, 2) + '\n');
}

function report(ok: boolean, title: string, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? '✔' : '✘'} ${title}${detail ? ` — ${detail}` : ''}`);
}

function findToken(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  for (const k of ['token', 'access_token', 'plainTextToken']) if (typeof d[k] === 'string') return d[k] as string;
  return null;
}

async function main() {
  console.log(`API: ${BASE}\n`);

  const health = await call('GET', '/health');
  report(health.status === 200 && (health.json as { status?: string })?.status === 'ok', '1. GET /health', `HTTP ${health.status}`);

  if (!EMAIL || !PASSWORD) {
    console.log('\n⚠ Faltan CHECK_API_EMAIL / CHECK_API_PASSWORD en .env: se saltean los pasos con sesión.');
    process.exit(failures ? 1 : 0);
  }

  const login = await call('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  const data = (login.json as { data?: unknown })?.data;
  token = findToken(data);
  report(login.status === 200 && !!token, '2. POST /auth/login', `HTTP ${login.status}${login.retryAfter ? ` (Retry-After ${login.retryAfter})` : ''}`);
  save('auth-login', login.json);
  if (!token) process.exit(1);

  const me = await call('GET', '/auth/me');
  report(me.status === 200, '3. GET /auth/me', `HTTP ${me.status}`);
  save('auth-me', me.json);

  const caps = await call('GET', '/capabilities');
  report(caps.status === 200, '4. GET /capabilities (Bearer)', caps.status === 200 ? 'acepta Bearer' : `HTTP ${caps.status} (¿solo API key?)`);
  save('capabilities', caps.json);

  const org = await call('GET', '/org/mermas/available?per_page=1');
  const env = org.json as { data?: unknown; meta?: unknown };
  report(org.status === 200 && Array.isArray(env?.data) && !!env?.meta, '5. GET /org/mermas/available?per_page=1', `HTTP ${org.status}, data+meta: ${!!env?.data && !!env?.meta}`);
  save('org-mermas-available', org.json);

  for (const [name, path] of [
    ['org-profile', '/org/profile'],
    ['org-stats', '/org/stats'],
    ['org-applications', '/org/applications?per_page=2'],
    ['org-assignments', '/org/assignments?per_page=2'],
    ['org-families', '/org/families'],
    ['org-demographics', '/org/families/demographics'],
    ['notifications', '/notifications?per_page=2'],
    ['notifications-unread', '/notifications/unread-count'],
  ] as const) {
    const r = await call('GET', path);
    console.log(`  · ${path} → HTTP ${r.status}`);
    if (r.status === 200) save(name, r.json);
  }

  if (PROBE) {
    console.log('\nRelevamiento de permisos (G-02):');
    const profile = (await call('GET', '/org/profile')).json as { data?: { id?: string } };
    const orgId = profile?.data?.id;
    const probes = [
      '/nutritional-groups',
      '/nutrition/summary?start_date=2026-01-01&end_date=2026-12-31',
      '/unified-products/search?q=leche',
      '/collection-sessions',
      '/programs',
      '/family-types',
      ...(orgId
        ? [
            `/organizations/${orgId}/contacts`,
            `/organizations/${orgId}/requirements`,
            `/organizations/${orgId}/documents`,
            `/organizations/${orgId}/social-data`,
            `/organizations/${orgId}/collection-commitments`,
          ]
        : []),
    ];
    for (const p of probes) {
      const r = await call('GET', p);
      console.log(`  ${r.status === 200 ? '✔' : r.status === 403 ? '⛔' : '·'} ${p} → HTTP ${r.status}`);
      if (r.status === 200) save(`probe-${p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`, r.json);
      await new Promise((res) => setTimeout(res, 1100)); // 60 req/min
    }
  }

  await call('POST', '/auth/logout');
  console.log(`\nMuestras enmascaradas en docs/api/samples/. ${failures ? `${failures} verificaciones fallaron.` : 'Todo OK.'}`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
