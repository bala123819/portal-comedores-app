export type ProgramType = 'recurrente' | 'por_demanda' | 'evento' | 'recoleccion';

export interface Program {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  program_type?: ProgramType | string | null;
  frequency?: 'semanal' | 'quincenal' | 'mensual' | 'unico' | string | null;
  starts_at?: string | null;
  ends_at?: string | null;
}

/** Jornada de recolección (`/collection-sessions`); `programada` es el único estado documentado */
export interface CollectionSession {
  id: string;
  program_id?: string;
  program?: Program | null;
  session_date: string;
  organization_id?: string | null;
  status?: string | null;
  total_kg?: number | null;
  volunteers_count?: number | null;
  hours_total?: number | null;
  notes?: string | null;
}

/** Taller / capacitación (`/programs/{id}/trainings`) */
export interface Training {
  id: string;
  title: string;
  description?: string | null;
  scheduled_at: string;
  duration_minutes?: number | null;
  location?: string | null;
  facilitator_name?: string | null;
  status?: string | null;
  notes?: string | null;
}
