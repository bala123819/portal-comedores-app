/// <reference types="node" />
/**
 * npm run agentes:conocimiento — exporta el recetario de la app (src/data/recetas) como documento
 * Markdown para cargar en el knowledge base del agente de Nutrición y Cocina en GoDubi.
 *
 * Salida: docs/agentes/nutricion/conocimiento/recetario.md
 * Volver a correrlo cada vez que cambie el recetario (npm run recetas:convertir).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { recetaSchema, type Receta } from '../src/features/recetas/schema';

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src/data/recetas');
const OUT_DIR = join(ROOT, 'docs/agentes/nutricion/conocimiento');

const GRUPOS: Record<string, string> = {
  cereales: 'cereales y legumbres',
  frutas_verduras: 'frutas y verduras',
  lacteos: 'lácteos',
  proteinas: 'carnes, huevos y legumbres',
  aceites: 'aceites y grasas',
};

const recetas: Receta[] = readdirSync(SRC)
  .filter((f) => f.endsWith('.json'))
  .map((f) => recetaSchema.parse(JSON.parse(readFileSync(join(SRC, f), 'utf8'))))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

const cantidad = (c: number | null, u: string | null) =>
  c === null ? 'a gusto' : `${String(c).replace('.', ',')}${u ? ` ${u}` : ''}`;

const partes = recetas.map((r) => {
  const grupos = [...new Set(r.ingredientes.map((i) => i.grupo_nutricional).filter(Boolean))]
    .map((g) => GRUPOS[g as string] ?? g)
    .join(', ');
  return [
    `## ${r.nombre}`,
    '',
    `- **recetaId:** \`${r.id}\``,
    `- **Categoría:** ${r.categoria}`,
    `- **Rinde (base):** ${r.raciones_base} porciones`,
    r.tiempo ? `- **Tiempo:** ${r.tiempo} minutos` : null,
    r.etiquetas.length ? `- **Etiquetas:** ${r.etiquetas.join(', ')}` : null,
    grupos ? `- **Grupos de alimentos:** ${grupos}` : null,
    r.fuente ? `- **Fuente:** ${r.fuente}` : null,
    '',
    `**Ingredientes (para ${r.raciones_base} porciones):**`,
    ...r.ingredientes.map((i) => `- ${i.nombre}: ${cantidad(i.cantidad, i.unidad)}${i.nota ? ` (${i.nota})` : ''}`),
    '',
    '**Preparación:**',
    ...r.pasos.map((p, n) => `${n + 1}. ${p}`),
    '',
  ]
    .filter((l) => l !== null)
    .join('\n');
});

const doc = `# Recetario del Portal Comedores

Documento generado desde la app (\`npm run agentes:conocimiento\`). Cada receta tiene un **recetaId**:
cuando sugieras una receta de este recetario, devolvé ese id exacto para que la app la abra y escale las cantidades.
Las cantidades están para las porciones base indicadas. Total de recetas: ${recetas.length}.

${partes.join('\n')}`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'recetario.md'), doc);
console.log(`✔ ${recetas.length} recetas exportadas a docs/agentes/nutricion/conocimiento/recetario.md`);
