/**
 * Lo recibido y panel nutricional según las respuestas REALES de `/org/received` y `/org/nutrition`
 * (docs/bda/11-recibido-nutricion.md, post 11/14 del Banco).
 */
import type { Meta } from '@/services/api/types';

export type ReceivedKind = 'distribution' | 'merma';

/** `origin.tag`: de dónde vino lo recibido. `origin.label` es el texto para mostrar. */
export type ReceivedOriginTag = 'inventario' | 'merma' | 'kit' | 'programa' | 'donacion_directa';

export interface ReceivedPreviewItem {
  name: string;
  quantity: number;
  unit: string;
  kg?: number | null;
}

export interface ReceivedItem {
  /** `"<kind>:<id>"`: único entre pedidos y mermas */
  key: string;
  kind: ReceivedKind | string;
  id: string;
  date: string;
  number?: string | null;
  kg: number;
  items_count: number;
  /** Hasta 3 productos; `more_items` dice cuántos más hay */
  items_preview: ReceivedPreviewItem[];
  more_items: number;
  origin: { tag: ReceivedOriginTag | string; label: string };
  receipt_number?: string | null;
  /** Ruta de la API con el detalle completo (`/api/org/distributions/{id}` o `/api/org/assignments/{id}`) */
  detail_path?: string | null;
}

export interface ReceivedKindTotals {
  count: number;
  kg: number;
}

/** Resumen del período ENTERO (no sólo de la página) */
export interface ReceivedSummary {
  period: { from: string; to: string };
  total_count: number;
  total_kg: number;
  by_kind: Partial<Record<ReceivedKind, ReceivedKindTotals>>;
  by_month: { month: string; count: number; kg: number }[];
  last_received_date?: string | null;
  /**
   * No figura en el post 11: lo devuelve el servidor real (2026-10-20). En el tenant de pruebas
   * coincide con las mermas retiradas. Significado sin confirmar (G-18): la app no lo muestra.
   */
  reconciliation_pending?: ReceivedKindTotals | null;
}

/** Página de `/org/received`: `data: { summary, items }` y `meta` afuera de `data`. */
export interface ReceivedPage {
  summary: ReceivedSummary;
  items: ReceivedItem[];
  meta: Meta;
}

export interface ReceivedFilter {
  /** AAAA-MM-DD. Por defecto, los últimos 90 días (máximo 1 año) */
  from?: string;
  to?: string;
  kind?: ReceivedKind;
}

export interface NutritionGroupCoverage {
  code: string;
  name: string;
  color?: string | null;
  received_kg: number;
  /** Lo que la organización necesita del grupo en el período (sale de su cupo) */
  quota_kg?: number | null;
  /** recibido / necesidad × 100. `null` si el banco no cargó el cupo por grupo */
  coverage_pct?: number | null;
}

/** `GET /org/nutrition?month=AAAA-MM` */
export interface OrgNutrition {
  period: { from: string; to: string; months: number };
  beneficiaries?: {
    total_beneficiaries?: number | null;
    services_per_day?: number | null;
    organization_type?: string | null;
  } | null;
  groups: NutritionGroupCoverage[];
  /** Productos recibidos sin grupo nutricional cargado */
  unclassified_kg: number;
  /** Bultos surtidos (cajones mixtos): no se pueden repartir por grupo */
  bulk_kg: number;
  totals: { received_kg: number; quota_kg?: number | null; coverage_pct?: number | null };
  sources?: { distributions_kg: number; mermas_kg: number } | null;
  /** `false`: el banco no cargó el cupo por grupo → mostrar lo recibido sin porcentaje */
  needs_available: boolean;
}
