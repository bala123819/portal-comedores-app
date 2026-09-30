/**
 * Matching simple entre alimentos recibidos (productos de una merma/asignación) y recetas.
 * La lógica inteligente la hace el agente de recetas; esto es el fallback local:
 * coincidencia por nombre normalizado y, en segundo lugar, por grupo nutricional de la API.
 */
import type { Receta } from '@/features/recetas/schema';

export interface FoodItem {
  name: string;
  nutritional_group?: string | null;
}

export interface RecipeMatch {
  receta: Receta;
  score: number;
  /** Ingredientes de la receta que coinciden con lo recibido */
  coincidencias: string[];
}

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'en', 'para', 'x']);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singular(w: string): string {
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}

export function tokens(s: string): string[] {
  return normalize(s)
    .split(' ')
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(singular);
}

function namesMatch(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = new Set(tokens(b));
  return ta.some((t) => tb.has(t) || [...tb].some((x) => x.startsWith(t) || t.startsWith(x)));
}

export function matchRecipes(foods: FoodItem[], recetas: Receta[], limit = 5): RecipeMatch[] {
  if (!foods.length) return [];
  const groups = new Set(foods.map((f) => f.nutritional_group).filter(Boolean) as string[]);

  return recetas
    .map((receta) => {
      const coincidencias: string[] = [];
      let score = 0;
      for (const ing of receta.ingredientes) {
        if (foods.some((f) => namesMatch(f.name, ing.nombre))) {
          coincidencias.push(ing.nombre);
          score += 3;
        } else if (ing.grupo_nutricional && groups.has(ing.grupo_nutricional)) {
          score += 0.5;
        }
      }
      return { receta, score, coincidencias };
    })
    .filter((m) => m.coincidencias.length > 0)
    .sort((a, b) => b.score - a.score || b.coincidencias.length - a.coincidencias.length)
    .slice(0, limit);
}
