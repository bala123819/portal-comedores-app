import { useQuery } from '@tanstack/react-query';
import type { FoodItem } from '@/lib/recipe-match';
import { recetasRepository, type RecetasFilter } from './repository';

export function useRecetas(filter: RecetasFilter) {
  return useQuery({
    queryKey: ['recetas', 'list', filter],
    queryFn: () => recetasRepository.list(filter),
    staleTime: Infinity,
    meta: { persist: true },
  });
}

export function useReceta(id: string) {
  return useQuery({
    queryKey: ['recetas', 'detail', id],
    queryFn: () => recetasRepository.get(id),
    staleTime: Infinity,
    meta: { persist: true },
  });
}

export function useCategorias() {
  return useQuery({
    queryKey: ['recetas', 'categorias'],
    queryFn: () => recetasRepository.categories(),
    staleTime: Infinity,
  });
}

/** Recetas sugeridas para los alimentos de una merma o asignación (matching local) */
export function useSugerencias(foods: FoodItem[], limit = 3) {
  const key = foods.map((f) => `${f.name}|${f.nutritional_group ?? ''}`).join(',');
  return useQuery({
    queryKey: ['recetas', 'sugerencias', key, limit],
    queryFn: () => recetasRepository.suggest(foods, limit),
    enabled: foods.length > 0,
    staleTime: Infinity,
  });
}
