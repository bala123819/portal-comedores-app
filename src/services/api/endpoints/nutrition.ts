import type {
  NutritionalGroup,
  NutritionSummary,
  UnifiedProduct,
} from '@/features/nutricion/types';
import { api } from '../client';

const id = (v: string) => encodeURIComponent(v);

export const nutritionApi = {
  groups: () => api.get<NutritionalGroup[]>('/nutritional-groups'),
  mermaSummary: (mermaId: string) =>
    api.get<NutritionSummary>(`/nutrition/merma/${id(mermaId)}/summary`),
  /** Fechas YYYY-MM-DD */
  summary: (startDate: string, endDate: string) =>
    api.get<NutritionSummary>('/nutrition/summary', { start_date: startDate, end_date: endDate }),
  searchProducts: (q: string, limit = 20) =>
    api.get<UnifiedProduct[]>('/unified-products/search', { q, limit }),
  product: (productId: string) => api.get<UnifiedProduct>(`/unified-products/${id(productId)}`),
};
