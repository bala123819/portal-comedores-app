/**
 * Escalado de recetas según la cantidad de personas, con redondeo sensato por unidad:
 * - gramos: múltiplos de 5/10/50; pasa a kg desde 1000 g
 * - kg / litros: cuartos (0,25); pasa a g / ml debajo de 1
 * - ml: múltiplos de 10/50; pasa a litros desde 1000 ml
 * - unidades: medias hasta 3, enteros después (mínimo 1 si la receta lo usa)
 * - cucharadas, tazas: cuartos, mostrados como fracciones (½, ¼, ¾); desde ~120 ml pasan a ml/litros
 */
import { formatNumber } from './format';

export interface ScaledQuantity {
  cantidad: number | null;
  unidad: string | null;
  texto: string;
}

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

function withFraction(n: number): string {
  const whole = Math.floor(n);
  const frac = Number((n - whole).toFixed(2));
  const f = FRACTIONS[String(frac)];
  if (!f) return formatNumber(n, 2);
  return whole ? `${whole} ${f}` : f;
}

const norm = (u: string) =>
  u
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

const UNIT_KIND: Record<string, 'g' | 'kg' | 'ml' | 'l' | 'u' | 'spoon' | 'cup'> = {
  g: 'g',
  gr: 'g',
  gramos: 'g',
  gramo: 'g',
  kg: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  ml: 'ml',
  cc: 'ml',
  l: 'l',
  lt: 'l',
  litro: 'l',
  litros: 'l',
  unidad: 'u',
  unidades: 'u',
  u: 'u',
  diente: 'u',
  dientes: 'u',
  paquete: 'u',
  paquetes: 'u',
  lata: 'u',
  latas: 'u',
  docena: 'u',
  docenas: 'u',
  cucharada: 'spoon',
  cucharadas: 'spoon',
  cucharadita: 'spoon',
  cucharaditas: 'spoon',
  taza: 'cup',
  tazas: 'cup',
};

/** Equivalencias caseras aproximadas */
function mlPerUnit(unit: string): number {
  const u = norm(unit);
  if (u.startsWith('cucharadita')) return 5;
  if (u.startsWith('cucharada')) return 15;
  return 250; // taza
}

function plural(unit: string, n: number): string {
  if (n <= 1) {
    if (unit.endsWith('as') || unit.endsWith('os')) return unit.slice(0, -1);
    if (unit === 'unidades') return 'unidad';
  }
  return unit;
}

export function scaleQuantity(
  cantidad: number | null,
  unidad: string | null,
  factor: number,
): ScaledQuantity {
  if (cantidad === null) return { cantidad: null, unidad, texto: 'a gusto' };
  const raw = cantidad * factor;
  const kind = unidad ? UNIT_KIND[norm(unidad)] : undefined;

  switch (kind) {
    case 'g':
    case 'kg': {
      const grams = kind === 'kg' ? raw * 1000 : raw;
      if (grams >= 1000) {
        const kg = roundTo(grams / 1000, 0.25);
        return { cantidad: kg, unidad: 'kg', texto: `${formatNumber(kg, 2)} kg` };
      }
      const g = Math.max(5, roundTo(grams, grams < 100 ? 5 : grams < 500 ? 10 : 50));
      return { cantidad: g, unidad: 'g', texto: `${formatNumber(g, 0)} g` };
    }
    case 'ml':
    case 'l': {
      const ml = kind === 'l' ? raw * 1000 : raw;
      if (ml >= 1000) {
        const l = roundTo(ml / 1000, 0.25);
        return { cantidad: l, unidad: 'litros', texto: `${formatNumber(l, 2)} ${l === 1 ? 'litro' : 'litros'}` };
      }
      const v = Math.max(10, roundTo(ml, ml < 200 ? 10 : 50));
      return { cantidad: v, unidad: 'ml', texto: `${formatNumber(v, 0)} ml` };
    }
    case 'u': {
      const v = Math.max(0.5, raw < 3 ? roundTo(raw, 0.5) : Math.round(raw));
      const u = plural(unidad!, v);
      return { cantidad: v, unidad, texto: `${withFraction(v)} ${u}` };
    }
    case 'spoon':
    case 'cup': {
      // Muchas cucharadas no se pueden medir: desde ~120 ml se pasa a ml / litros
      const ml = raw * mlPerUnit(unidad!);
      if (ml >= 120) return scaleQuantity(ml, 'ml', 1);
      const v = Math.max(0.25, roundTo(raw, 0.25));
      return { cantidad: v, unidad, texto: `${withFraction(v)} ${plural(unidad!, v)}` };
    }
    default: {
      const v = roundTo(raw, raw < 10 ? 0.5 : 1);
      return { cantidad: v, unidad, texto: `${formatNumber(v, 1)}${unidad ? ` ${unidad}` : ''}` };
    }
  }
}

export function scaleFactor(racionesBase: number, personas: number): number {
  if (racionesBase <= 0 || personas <= 0) return 1;
  return personas / racionesBase;
}
