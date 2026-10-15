/**
 * Pedidos de mercadería según las respuestas REALES de `/org/catalog`, `/org/quota` y
 * `/org/distributions*` (docs/bda/09-10-pedidos-mercaderia.md, verificadas contra el servidor).
 */

export type Availability = 'disponible' | 'poco_stock';

/** `GET /org/catalog`: no trae cantidades de stock, sólo `availability`. */
export interface CatalogProduct {
  product_id: string;
  name: string;
  brand?: string | null;
  unit: string;
  weight_per_unit_kg?: number | null;
  availability: Availability | string;
  availability_label?: string | null;
  image_url?: string | null;
  category?: { id: string; name: string } | null;
  nutritional_group?: { code: string; name: string } | null;
}

export interface CatalogFilter {
  search?: string;
  food_category_id?: string;
}

/** `GET /org/quota`. `enforced: false` = el cupo es informativo (el banco no bloquea). */
export interface Quota {
  month: string;
  monthly_quota_kg: number;
  delivered_kg: number;
  requested_in_progress_kg: number;
  remaining_kg: number;
  enforced: boolean;
}

export type DistributionStatus =
  | 'pendiente'
  | 'en_revision'
  | 'aprobada'
  | 'programada'
  | 'en_preparacion'
  | 'lista_para_retiro'
  | 'distribuida'
  | 'rechazada'
  | 'cancelada'
  | 'anulada';

export interface DistributionItem {
  id: string;
  product: { id: string; name: string; brand?: string | null };
  unit: string;
  weight_per_unit_kg?: number | null;
  quantity_requested: number;
  /** Lo fija el banco al aprobar */
  quantity_approved?: number | null;
  quantity_delivered?: number | null;
  kg_requested?: number | null;
}

/** El listado no trae `items`; el detalle sí. */
export interface Distribution {
  id: string;
  number: string;
  status: DistributionStatus | string;
  status_label?: string | null;
  request_date?: string | null;
  requested_distribution_date?: string | null;
  scheduled_distribution_date?: string | null;
  actual_distribution_date?: string | null;
  /** Texto libre: "mañana", "09:00-12:00"… */
  time_slot?: string | null;
  pickup_type?: string | null;
  total_items?: number | null;
  total_kg?: number | null;
  is_urgent?: boolean | null;
  urgency_reason?: string | null;
  notes?: string | null;
  rejection_reason?: string | null;
  received_by_name?: string | null;
  receipt_number?: string | null;
  can_cancel?: boolean | null;
  receipt_available?: boolean | null;
  requested_by_organization?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  items?: DistributionItem[];
}

/** `status=abiertos` = en curso; o un estado puntual. */
export type DistributionsFilter = 'abiertos' | DistributionStatus;

/** Body de `POST /org/distributions` (no está en el OpenAPI: sale de la guía del Banco, post 9). */
export interface CreateDistributionBody {
  requested_distribution_date: string;
  time_slot?: string | null;
  notes?: string | null;
  is_urgent?: boolean;
  urgency_reason?: string | null;
  items: { product_id: string; quantity_requested: number }[];
}

export interface DistributionWarning {
  code: 'STOCK_INSUFFICIENT' | 'QUOTA_EXCEEDED' | string;
  field?: string | null;
  message: string;
}

/** La respuesta del alta trae `warnings` y `quota` FUERA de `data`. */
export interface CreateDistributionResult {
  distribution: Distribution;
  warnings: DistributionWarning[];
  quota?: Quota;
}

/** Reglas del Banco (post 9) */
export const ORDER_RULES = {
  maxItems: 30,
  maxOpenRequests: 3,
} as const;
