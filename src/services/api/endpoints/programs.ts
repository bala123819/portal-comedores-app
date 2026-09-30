import type { CollectionSession, Program, Training } from '@/features/programas/types';
import { api } from '../client';

const id = (v: string) => encodeURIComponent(v);

export const programsApi = {
  programs: () => api.getPage<Program>('/programs', { per_page: 50 }),
  trainings: (programId: string) =>
    api.getPage<Training>(`/programs/${id(programId)}/trainings`, { per_page: 50 }),
  /** Sin filtros documentados (G-09): se filtra por organización del lado del cliente */
  sessions: () => api.getPage<CollectionSession>('/collection-sessions', { per_page: 50 }),
  /** "La organización confirma su asistencia anticipadamente" */
  confirmSession: (sessionId: string, key: string) =>
    api.put<CollectionSession>(`/collection-sessions/${id(sessionId)}/confirm`, {}, key),
};
