/// <reference types="node" />
/**
 * npm run smoke — equivalente en TypeScript de scripts/smoke-test.sh (del Banco de Alimentos),
 * sin depender de jq/uuidgen: corre igual en Windows, macOS y Linux.
 *
 * Credenciales SOLO desde .env (CHECK_API_EMAIL / CHECK_API_PASSWORD). Nunca en el repo ni en el bundle.
 * No modifica datos de negocio: crea y borra un aviso de prueba en la propia bandeja y abre/cierra sesión.
 * ~22 pedidos espaciados (límite: 60/min; login 10/min). Producción compartida: no correr en loop.
 *
 * Flags:
 *   --samples  guarda respuestas con datos personales enmascarados en docs/api/samples/ (gitignored)
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { maskPersonalData } from '../src/lib/mask';

const ROOT = join(__dirname, '..');
if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));

const API = (process.env.MERMAB_API || process.env.EXPO_PUBLIC_API_URL || 'https://cloud.mermab.com/api').replace(/\/$/, '');
const EMAIL = process.env.CHECK_API_EMAIL || process.env.MERMAB_EMAIL;
const PASSWORD = process.env.CHECK_API_PASSWORD || process.env.MERMAB_PASSWORD;
const SAMPLES = process.argv.includes('--samples');
const SAMPLES_DIR = join(ROOT, 'docs/api/samples');

let token = '';
let code = 0;
let body: any = null;
let pass = 0;
let fail = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call(method: string, path: string, data?: unknown) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (method === 'POST') headers['Idempotency-Key'] = randomUUID();
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(`${API}${path}`, { method, headers, body: data !== undefined ? JSON.stringify(data) : undefined });
    code = res.status;
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  } catch {
    code = 0;
    body = null;
  }
  await sleep(300);
}

function expect(name: string, want: number, check?: (b: any) => boolean, desc = '') {
  let ok = code === want;
  let detail = ok ? `HTTP ${code}` : `esperaba HTTP ${want} y llegó ${code}`;
  if (ok && check) {
    let passed = false;
    try {
      passed = !!check(body);
    } catch {
      passed = false;
    }
    if (!passed) {
      ok = false;
      detail = `HTTP ${code} pero la respuesta no cumple: ${desc}`;
    }
  }
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(58)} ${detail}`);
  if (!ok) console.log(JSON.stringify(body).slice(0, 300));
}

function save(name: string) {
  if (!SAMPLES) return;
  mkdirSync(SAMPLES_DIR, { recursive: true });
  writeFileSync(join(SAMPLES_DIR, `${name}.json`), JSON.stringify(maskPersonalData(body), null, 2) + '\n');
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('Faltan CHECK_API_EMAIL / CHECK_API_PASSWORD en .env (ver .env.example).');
    process.exit(2);
  }
  console.log(`API: ${API}\n`);

  await call('GET', '/health');
  expect('GET  /health', 200, (b) => b.status === 'ok', '.status == "ok"');
  await call('GET', '/capabilities');
  expect('GET  /capabilities sin token da 401', 401);

  await call('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  expect('POST /auth/login', 200, (b) => b.data.access_token && b.data.user.roles.includes('organization_coordinator'), 'access_token y rol organization_coordinator');
  token = body?.data?.access_token ?? '';
  if (body?.data) body = { ...body, data: { ...body.data, access_token: '«token»' } };
  save('auth-login');
  if (!token) {
    console.log('\nSin token no se puede seguir. Revisá el mail y la clave.');
    process.exit(1);
  }

  await call('GET', '/auth/me');
  expect('GET  /auth/me', 200, (b) => b.data.email != null, '.data.email != null');
  save('auth-me');
  await call('GET', '/capabilities');
  expect('GET  /capabilities', 200, (b) => b.data.rate_limits.general != null, '.data.rate_limits.general != null');
  save('capabilities');
  await call('GET', '/org/profile');
  expect('GET  /org/profile', 200, (b) => b.data.organization.id != null, '.data.organization.id != null');
  save('org-profile');
  await call('GET', '/org/stats');
  expect('GET  /org/stats', 200, (b) => b.data.impacto != null, '.data.impacto != null');
  save('org-stats');

  await call('GET', '/org/families?per_page=2');
  expect('GET  /org/families?per_page=2', 200, (b) => Array.isArray(b.data), '.data es array');
  save('org-families');
  const familyId = body?.data?.[0]?.id;
  if (familyId) {
    await call('GET', `/org/families/${familyId}`);
    expect('GET  /org/families/{id}', 200, (b) => b.data.id != null, '.data.id != null');
    save('org-family');
  } else {
    console.log('SKIP  GET /org/families/{id} (la organización no tiene familias)');
  }
  await call('GET', '/org/families/demographics');
  expect('GET  /org/families/demographics', 200, (b) => b.data.total_families != null, '.data.total_families != null');
  save('org-demographics');
  await call('GET', '/org/families?source=cualquiera');
  expect('GET  /org/families?source=x da 422', 422, (b) => b.errors.source != null, '.errors.source != null');
  await call('GET', '/org/families/00000000-0000-4000-8000-000000000000');
  expect('GET  /org/families/{uuid inexistente} da 404', 404);

  await call('GET', '/notifications/unread-count');
  expect('GET  /notifications/unread-count', 200, (b) => b.data.count != null, '.data.count != null');
  await call('GET', '/notifications?per_page=5');
  expect('GET  /notifications', 200, (b) => Array.isArray(b.data.data), '.data.data es array');
  save('notifications');
  await call('POST', '/notifications/test');
  expect('POST /notifications/test', 200, (b) => b.data.notification.id != null, '.data.notification.id != null');
  const notifId = body?.data?.notification?.id;
  if (notifId) {
    await call('POST', `/notifications/${notifId}/read`);
    expect('POST /notifications/{id}/read', 200);
    await call('DELETE', `/notifications/${notifId}`);
    expect('DELETE /notifications/{id}', 200);
  }

  await call('PUT', '/auth/profile', { phone: 'abc' });
  expect('PUT  /auth/profile con teléfono inválido da 422', 422, (b) => b.errors.phone != null, '.errors.phone != null');
  await call('GET', '/organizations');
  expect('GET  /organizations (ruta del banco) da 403', 403);

  await call('POST', '/auth/logout');
  expect('POST /auth/logout', 200);
  await call('GET', '/auth/me');
  expect('GET  /auth/me con el token cerrado da 401', 401);

  console.log(`\nRESULTADO: ${pass} PASS, ${fail} FAIL`);
  if (SAMPLES) console.log('Muestras enmascaradas en docs/api/samples/ (no se versionan).');
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
