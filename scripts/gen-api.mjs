/**
 * Genera src/services/api/schema.d.ts desde docs/api/openapi.yaml.
 *
 * El spec tiene operationId duplicados (p. ej. el `complete` del Portal Organización y el del
 * módulo admin comparten "completarAsignacin"), y openapi-typescript fusiona las operaciones
 * que comparten id: el body de /org/.../complete terminaba siendo el del admin.
 * Antes de generar, se renombra cada duplicado con un sufijo derivado de su ruta.
 * Ver docs/api-gaps.md (G-07).
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const spec = load(readFileSync(join(root, 'docs/api/openapi.yaml'), 'utf8'));

const seen = new Map();
let renamed = 0;
for (const [path, ops] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(ops)) {
    if (!op || typeof op !== 'object' || !op.operationId) continue;
    if (seen.has(op.operationId)) {
      const suffix = path
        .replace(/^\/api\//, '')
        .replace(/[{}]/g, '')
        .split('/')
        .map((s) => s.replace(/[^a-zA-Z0-9]/g, '_'))
        .join('_');
      op.operationId = `${op.operationId}__${method}_${suffix}`;
      renamed++;
    } else {
      seen.set(op.operationId, path);
    }
  }
}

const tmpDir = join(root, 'node_modules/.cache/gen-api');
mkdirSync(tmpDir, { recursive: true });
const tmp = join(tmpDir, 'openapi.normalized.json');
writeFileSync(tmp, JSON.stringify(spec));
console.log(`operationId duplicados renombrados: ${renamed}`);

execSync(`npx --yes openapi-typescript@7 "${tmp}" -o src/services/api/schema.d.ts`, {
  cwd: root,
  stdio: 'inherit',
});
