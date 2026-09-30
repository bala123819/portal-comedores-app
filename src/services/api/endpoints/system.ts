import { api } from '../client';

export interface Health {
  status: string;
  timestamp?: string;
  version?: string;
  realtime?: { socket_url?: string };
}

export const systemApi = {
  health: () => api.get<Health>('/health', undefined, { auth: false }),
  /** Módulos y permisos del usuario autenticado */
  capabilities: () => api.get<Record<string, unknown>>('/capabilities'),
};
