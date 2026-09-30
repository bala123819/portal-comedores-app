import type { NutritionalGroupCode } from '@/features/mermas/types';

/** Campos de `POST /nutritional-groups` */
export interface NutritionalGroup {
  id: string;
  name: string;
  code: NutritionalGroupCode | string;
  description?: string | null;
  daily_recommended_grams?: number | null;
  priority_order?: number | null;
  icon?: string | null;
  color?: string | null;
  display_order?: number | null;
  products_count?: number | null;
}

/** Campos de `POST /unified-products` */
export interface UnifiedProduct {
  id: string;
  name: string;
  barcode?: string | null;
  brand?: string | null;
  generic_name?: string | null;
  description?: string | null;
  default_unit?: string | null;
  weight_per_unit_kg?: number | null;
  quantity_text?: string | null;
  food_category_id?: string | null;
  nutritional_group_id?: string | null;
  nutritional_group?: { name?: string; code?: string } | null;
  source?: string | null;
  /** Datos de Open Food Facts: forma sin documentar, se muestran los valores numéricos */
  nutriments?: Record<string, unknown> | null;
  nutrition_data?: Record<string, unknown> | null;
  image_url?: string | null;
}

/** `/nutrition/merma/{id}/summary` y `/nutrition/summary`: forma sin documentar */
export type NutritionSummary = Record<string, unknown>;
