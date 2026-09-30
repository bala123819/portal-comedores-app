/**
 * Capa de datos del recetario detrás de una interfaz: hoy viene del JSON local
 * (`src/data/recetas`, generado por `npm run recetas:convertir`); mañana puede venir de la API
 * (propuesta en api-gaps G-10) o de un endpoint de n8n sin tocar las pantallas.
 */
import { recetasData } from '@/data/recetas';
import { matchRecipes, normalize, type FoodItem, type RecipeMatch } from '@/lib/recipe-match';
import { recetaSchema, type Receta } from './schema';

export interface RecetasFilter {
  search?: string;
  categoria?: string | null;
  etiqueta?: string | null;
}

export interface RecetasRepository {
  list(filter?: RecetasFilter): Promise<Receta[]>;
  get(id: string): Promise<Receta | null>;
  categories(): Promise<string[]>;
  suggest(foods: FoodItem[], limit?: number): Promise<RecipeMatch[]>;
}

function loadLocal(): Receta[] {
  const out: Receta[] = [];
  for (const raw of recetasData) {
    const r = recetaSchema.safeParse(raw);
    if (r.success) out.push(r.data);
    else if (__DEV__) console.warn('[recetas] receta inválida', r.error.issues);
  }
  return out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

class LocalRecetasRepository implements RecetasRepository {
  private cache: Receta[] | null = null;

  private all(): Receta[] {
    this.cache ??= loadLocal();
    return this.cache;
  }

  async list({ search, categoria, etiqueta }: RecetasFilter = {}) {
    const q = search ? normalize(search) : '';
    return this.all().filter(
      (r) =>
        (!categoria || r.categoria === categoria) &&
        (!etiqueta || r.etiquetas.includes(etiqueta)) &&
        (!q ||
          normalize(r.nombre).includes(q) ||
          r.ingredientes.some((i) => normalize(i.nombre).includes(q)) ||
          r.etiquetas.some((e) => normalize(e).includes(q))),
    );
  }

  async get(id: string) {
    return this.all().find((r) => r.id === id) ?? null;
  }

  async categories() {
    return [...new Set(this.all().map((r) => r.categoria))].sort((a, b) => a.localeCompare(b, 'es'));
  }

  async suggest(foods: FoodItem[], limit = 5) {
    return matchRecipes(foods, this.all(), limit);
  }
}

export const recetasRepository: RecetasRepository = new LocalRecetasRepository();
