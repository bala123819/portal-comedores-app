/**
 * npm run bitacora — lista los commits que todavía no tienen entrada en docs/tesis/bitacora.md.
 * npm run bitacora -- --write — además agrega al final un esqueleto de entrada por cada uno
 * (hash, fecha, autoría, archivos tocados) para completar a mano con la plantilla.
 *
 * Se ignoran los commits cuyo asunto empieza con "docs(bitacora)": son los que sólo completan
 * la bitácora del commit anterior (se documentan dentro de esa entrada).
 */
import { execSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'docs/tesis/bitacora.md');
const write = process.argv.includes('--write');

const git = (cmd) => execSync(`git ${cmd}`, { cwd: root, encoding: 'utf8' }).trim();

const bitacora = readFileSync(file, 'utf8');
const commits = git('log --reverse --format=%h%x09%ad%x09%an%x09%s --date=format:"%Y-%m-%d %H:%M"')
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [hash, date, author, subject] = line.split('\t');
    return { hash, date, author, subject };
  })
  .filter((c) => !c.subject.startsWith('docs(bitacora)'))
  .filter((c) => !bitacora.includes(`## ${c.hash} `) && !bitacora.includes(`(${c.hash})`));

if (!commits.length) {
  console.log('✔ Todos los commits tienen entrada en docs/tesis/bitacora.md');
  process.exit(0);
}

console.log(`Commits sin entrada en la bitácora (${commits.length}):`);
for (const c of commits) console.log(`  ${c.hash}  ${c.date}  ${c.subject}`);

if (!write) {
  console.log('\nCorré `npm run bitacora -- --write` para agregar los esqueletos.');
  process.exit(1);
}

for (const c of commits) {
  const files = git(`show --stat=120 --format= ${c.hash}`)
    .split('\n')
    .filter((l) => l.includes('|'))
    .map((l) => '`' + l.split('|')[0].trim() + '`')
    .slice(0, 25);
  const coauthors = git(`show -s --format=%b ${c.hash}`).match(/Co-Authored-By: ([^<]+)/gi);
  const authorship = coauthors ? `${c.author} + asistencia de IA` : c.author;
  appendFileSync(
    file,
    `
---

## ${c.hash} · ${c.subject}
- **Fecha:** ${c.date} · **Autoría:** ${authorship}
- **Etapa:** <completar>

**Objetivo.** <completar>

**Qué se hizo.**
- <completar>

**Decisiones.** <D-xx o "ninguna">

**Problemas y soluciones.** <P-xx o "ninguno">

**Verificación.** <typecheck, lint, pruebas manuales: plataforma y modo>

**Pendientes.** <completar>

**Archivos principales.** ${files.join(', ')}
`,
  );
}
console.log(`\nAgregados ${commits.length} esqueleto(s) al final de docs/tesis/bitacora.md: completalos.`);
