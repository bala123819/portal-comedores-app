/// <reference types="node" />
/**
 * Convierte los recetarios de docs/recetarios/ a src/data/recetas/*.json (validados con zod)
 * y regenera src/data/recetas/index.ts.
 *
 * Formatos soportados:
 *  - .json: { fuente?, recetas: [...] } o un array de recetas.
 *    Cada receta: nombre, categoria, raciones, tiempo_minutos?, etiquetas?, ingredientes[
 *    { nombre, cantidad|null, unidad|null, grupo? }], pasos[], informacion_nutricional?
 *  - .csv (separador `,` o `;`, con encabezado):
 *      receta,categoria,raciones,tiempo_minutos,etiquetas,tipo,texto,cantidad,unidad,grupo
 *    `tipo` = ingrediente | paso. Una fila por ingrediente o paso; `etiquetas` separadas por `|`.
 *  - .xlsx / .docx / .pdf: exportarlos a CSV (Excel: "Guardar como CSV UTF-8") o transcribirlos a
 *    JSON. No se agregan dependencias pesadas de parsing a la app.
 *
 * Datos faltantes quedan opcionales: el script NO completa información que no esté en la fuente.
 *
 * Uso: npm run recetas:convertir
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { recetaSchema, type Receta } from '../src/features/recetas/schema';

const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'docs/recetarios');
const OUT_DIR = join(ROOT, 'src/data/recetas');

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

type Raw = Record<string, unknown>;

function fromRaw(r: Raw, fuente?: string): unknown {
  const ingredientes = ((r.ingredientes as Raw[]) ?? []).map((i) => ({
    nombre: String(i.nombre ?? '').trim(),
    cantidad: num(i.cantidad),
    unidad: i.unidad ? String(i.unidad).trim() : null,
    ...(i.grupo || i.grupo_nutricional
      ? { grupo_nutricional: String(i.grupo ?? i.grupo_nutricional) }
      : {}),
    ...(i.nota ? { nota: String(i.nota) } : {}),
  }));
  const tiempo = num(r.tiempo_minutos ?? r.tiempo);
  return {
    id: slug(String(r.id ?? r.nombre)),
    nombre: String(r.nombre ?? '').trim(),
    categoria: String(r.categoria ?? 'Sin categoría').trim(),
    raciones_base: Math.round(num(r.raciones ?? r.raciones_base) ?? 0),
    ingredientes,
    pasos: ((r.pasos as unknown[]) ?? []).map((p) => String(p).trim()).filter(Boolean),
    ...(tiempo ? { tiempo: Math.round(tiempo) } : {}),
    ...(r.informacion_nutricional ? { informacion_nutricional: r.informacion_nutricional } : {}),
    etiquetas: ((r.etiquetas as unknown[]) ?? []).map(String),
    ...(r.fuente || fuente ? { fuente: String(r.fuente ?? fuente) } : {}),
  };
}

function parseCsv(text: string): Raw[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const split = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = !quoted;
      } else if (c === sep && !quoted) {
        out.push(cur);
        cur = '';
      } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = split(lines[0]).map((h) => slug(h).replace(/-/g, '_'));
  const byRecipe = new Map<string, Raw>();
  for (const line of lines.slice(1)) {
    const cells = split(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ''));
    if (!row.receta) continue;
    let r = byRecipe.get(row.receta);
    if (!r) {
      r = {
        nombre: row.receta,
        categoria: row.categoria,
        raciones: row.raciones,
        tiempo_minutos: row.tiempo_minutos,
        etiquetas: row.etiquetas ? row.etiquetas.split('|').map((s) => s.trim()) : [],
        ingredientes: [],
        pasos: [],
      };
      byRecipe.set(row.receta, r);
    }
    if (row.tipo === 'paso') (r.pasos as string[]).push(row.texto);
    else
      (r.ingredientes as Raw[]).push({
        nombre: row.texto,
        cantidad: row.cantidad,
        unidad: row.unidad,
        grupo: row.grupo,
      });
  }
  return [...byRecipe.values()];
}

function main() {
  let files: string[] = [];
  try {
    files = readdirSync(SRC_DIR);
  } catch {
    console.error(`No existe ${SRC_DIR}. Copiá ahí los recetarios.`);
    process.exit(1);
  }

  const recetas: Receta[] = [];
  const errores: string[] = [];

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const path = join(SRC_DIR, file);
    let raws: Raw[] = [];
    let fuente: string | undefined;
    if (ext === '.json') {
      const parsed = JSON.parse(readFileSync(path, 'utf8'));
      raws = Array.isArray(parsed) ? parsed : (parsed.recetas ?? []);
      fuente = Array.isArray(parsed) ? undefined : parsed.fuente;
    } else if (ext === '.csv') {
      raws = parseCsv(readFileSync(path, 'utf8'));
      fuente = file;
    } else if (['.xlsx', '.xls', '.docx', '.doc', '.pdf'].includes(ext)) {
      console.warn(`⚠ ${file}: exportalo a CSV o JSON (ver encabezado del script).`);
      continue;
    } else continue;

    for (const raw of raws) {
      const result = recetaSchema.safeParse(fromRaw(raw, fuente));
      if (result.success) recetas.push(result.data);
      else
        errores.push(
          `${file} › ${String(raw.nombre ?? '?')}: ${result.error.issues
            .map((i) => `${i.path.join('.')} ${i.message}`)
            .join('; ')}`,
        );
    }
  }

  const ids = new Set<string>();
  for (const r of recetas) {
    if (ids.has(r.id)) errores.push(`id duplicado: ${r.id}`);
    ids.add(r.id);
  }

  if (errores.length) {
    console.error('Recetas con errores (no se escribieron):\n  ' + errores.join('\n  '));
  }

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  const valid = recetas.filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);
  for (const r of valid) {
    writeFileSync(join(OUT_DIR, `${r.id}.json`), JSON.stringify(r, null, 2) + '\n');
  }
  const ident = (id: string) => '_' + id.replace(/-/g, '_');
  const index =
    '// Generado por scripts/convertir-recetas.ts — no editar a mano.\n' +
    valid.map((r) => `import ${ident(r.id)} from './${r.id}.json';`).join('\n') +
    `\n\nexport const recetasData: unknown[] = [${valid.map((r) => ident(r.id)).join(', ')}];\n`;
  writeFileSync(join(OUT_DIR, 'index.ts'), index);

  console.log(`✔ ${valid.length} recetas escritas en src/data/recetas`);
  if (errores.length) process.exit(1);
}

main();
