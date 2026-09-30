/**
 * Tipos de respuesta escritos a mano (el spec no documenta respuestas, ver api-gaps G-01).
 * Solo se usan nombres de campo que aparecen en el OpenAPI (bodies, filtros, columnas de orden).
 * Todo lo que no está garantizado es opcional.
 */

export type MermaStatus =
  | 'activa'
  | 'asignada'
  | 'en_proceso'
  | 'completada'
  | 'cancelada'
  | 'vencida'
  | 'perdida';

export type MermaPriority = 'baja' | 'normal' | 'alta' | 'critica';

export type ProductUnit = 'kg' | 'litros' | 'unidades' | 'paquetes' | 'cajas' | 'docenas';

export type ProductCategory = 'no_perecedero' | 'fresco' | 'congelado' | 'enlatado' | 'bebida';

export type ProductCondition = 'excellent' | 'good' | 'fair' | 'poor';

export type NutritionalGroupCode =
  | 'cereales'
  | 'frutas_verduras'
  | 'lacteos'
  | 'proteinas'
  | 'aceites';

/** Campos de `POST /mermas` → products[] */
export interface MermaProduct {
  id: string;
  name: string;
  product_id?: string | null;
  description?: string | null;
  category?: ProductCategory | string | null;
  nutritional_group?: NutritionalGroupCode | string | null;
  food_category_id?: string | null;
  nutritional_group_id?: string | null;
  quantity: number;
  unit: ProductUnit | string;
  weight_per_unit_kg?: number | null;
  barcode?: string | null;
  expiry_date?: string | null;
  estimated_unit_value?: number | null;
  condition?: ProductCondition | string | null;
  /** Incrementado al aprobar postulaciones */
  quantity_assigned?: number | null;
}

export interface NamedRef {
  id: string;
  name: string;
}

export interface BranchRef extends NamedRef {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  state?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Campos de `POST /mermas` + columnas de `sort_by` de `GET /mermas` */
export interface Merma {
  id: string;
  merma_number?: string | null;
  title: string;
  description?: string | null;
  status: MermaStatus | string;
  priority?: MermaPriority | string | null;
  is_urgent?: boolean | null;
  publication_date?: string | null;
  /** null = "Sin vencimiento" */
  deadline?: string | null;
  pickup_date?: string | null;
  pickup_time_start?: string | null;
  pickup_time_end?: string | null;
  requires_refrigerated_transport?: boolean | null;
  requires_loading_help?: boolean | null;
  returnable_containers?: boolean | null;
  requires_gel_coolers?: boolean | null;
  special_requirements?: string[] | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  total_products?: number | null;
  total_kg?: number | null;
  estimated_value?: number | null;
  applications_count?: number | null;
  created_at?: string | null;
  donor_id?: string | null;
  donor_branch_id?: string | null;
  donor?: NamedRef | null;
  donor_branch?: BranchRef | null;
  products?: MermaProduct[];
  /** Solo en `/org/mermas/available` cuando se filtra por distancia */
  distance_km?: number | null;
}

export interface AvailableMermasFilters {
  urgent?: boolean;
  priority?: MermaPriority;
  max_distance?: number;
}
