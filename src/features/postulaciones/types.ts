import type { Merma } from '@/features/mermas/types';

/**
 * `pendiente` y `rechazada` están confirmados por el spec; `aprobada` y `cancelada` son inferidos
 * (api-gaps G-04). `lib/status.ts` tiene fallback para valores desconocidos.
 */
export type ApplicationStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';

/** Campos de `POST /org/applications` + `PUT /applications/{id}/approve` */
export interface Application {
  id: string;
  merma_id: string;
  organization_id?: string;
  status: ApplicationStatus | string;
  message?: string | null;
  can_pickup_immediately?: boolean | null;
  preferred_pickup_time?: string | null;
  requires_transport_help?: boolean | null;
  response_notes?: string | null;
  created_at?: string | null;
  merma?: Merma | null;
}
