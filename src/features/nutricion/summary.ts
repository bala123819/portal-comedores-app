/**
 * Normalización de los resúmenes nutricionales. La forma de `/nutrition/*` no está documentada
 * (G-01), así que se extrae lo que haya sin inventar datos:
 * - números de primer nivel → tarjetas (con la clave humanizada)
 * - arrays de objetos con `code`/`name` y algún número → barras por grupo
 * Las unidades se muestran como indica la clave (kg, g, %), tal como vienen de la API.
 */
import { humanize, nutritionalGroupLabels, statLabels } from '@/lib/labels';

export interface SummaryStat {
  key: string;
  label: string;
  value: number;
  unit: string;
}

export interface SummaryBar {
  key: string;
  label: string;
  value: number;
  unit: string;
  color?: string | null;
}

const VALUE_KEYS = ['total_kg', 'kg', 'grams', 'total_grams', 'quantity', 'total', 'percentage', 'value'];

function unitFromKey(key: string): string {
  if (/percent|porcentaje|_pct$/i.test(key)) return '%';
  if (/grams|gramos|_g$/i.test(key)) return 'g';
  if (/kg/i.test(key)) return 'kg';
  return '';
}

export function statsFromObject(data: unknown, exclude: string[] = []): SummaryStat[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return Object.entries(data as Record<string, unknown>)
    .filter(([k, v]) => typeof v === 'number' && !exclude.includes(k) && !/(_id|^id)$/.test(k))
    .map(([k, v]) => ({
      key: k,
      label: statLabels[k] ?? humanize(k),
      value: v as number,
      unit: unitFromKey(k),
    }));
}

export function barsFromSummary(data: unknown): SummaryBar[] {
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  const candidates = Array.isArray(data)
    ? [data]
    : Object.values(obj).filter((v) => Array.isArray(v));

  for (const arr of candidates as unknown[][]) {
    const bars: SummaryBar[] = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const it = item as Record<string, unknown>;
      const nested = (it.nutritional_group ?? it.group) as Record<string, unknown> | undefined;
      const code = (it.code ?? nested?.code) as string | undefined;
      const name = (it.name ?? nested?.name) as string | undefined;
      const valueKey = VALUE_KEYS.find((k) => typeof it[k] === 'number');
      if (!valueKey || (!code && !name)) continue;
      bars.push({
        key: code ?? name ?? String(bars.length),
        label: name ?? (code ? nutritionalGroupLabels[code] ?? humanize(code) : ''),
        value: it[valueKey] as number,
        unit: unitFromKey(valueKey),
        color: (it.color ?? nested?.color) as string | undefined,
      });
    }
    if (bars.length) return bars;
  }

  // Alternativa: objeto { cereales: 12.5, lacteos: 3 }
  const byGroup = Object.entries(obj).filter(
    ([k, v]) => typeof v === 'number' && k in nutritionalGroupLabels,
  );
  return byGroup.map(([k, v]) => ({
    key: k,
    label: nutritionalGroupLabels[k],
    value: v as number,
    unit: '',
  }));
}

/** Valores numéricos de un bloque de nutrientes de Open Food Facts */
export function nutrientRows(nutriments: Record<string, unknown> | null | undefined) {
  if (!nutriments) return [];
  const names: Record<string, string> = {
    'energy-kcal_100g': 'Energía (kcal cada 100 g)',
    proteins_100g: 'Proteínas (g cada 100 g)',
    carbohydrates_100g: 'Hidratos de carbono (g cada 100 g)',
    sugars_100g: 'Azúcares (g cada 100 g)',
    fat_100g: 'Grasas (g cada 100 g)',
    'saturated-fat_100g': 'Grasas saturadas (g cada 100 g)',
    fiber_100g: 'Fibra (g cada 100 g)',
    salt_100g: 'Sal (g cada 100 g)',
    sodium_100g: 'Sodio (g cada 100 g)',
  };
  return Object.entries(nutriments)
    .filter(([k, v]) => typeof v === 'number' && (k in names || k.endsWith('_100g')))
    .map(([k, v]) => ({ key: k, label: names[k] ?? humanize(k), value: v as number }));
}
