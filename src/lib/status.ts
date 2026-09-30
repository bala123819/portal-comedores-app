import {
  AlertTriangle,
  Ban,
  CalendarCheck,
  CheckCircle2,
  Circle,
  Clock,
  PackageCheck,
  ThumbsUp,
  Truck,
  UserX,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import type { Tone } from '@/theme/tokens';
import {
  applicationStatusLabels,
  assignmentStatusLabels,
  humanize,
  mermaStatusLabels,
  sessionStatusLabels,
} from './labels';

export type StatusKind = 'merma' | 'application' | 'assignment' | 'session';

export interface StatusMeta {
  label: string;
  tone: Tone;
  icon: LucideIcon;
}

type StatusMap = Record<string, StatusMeta>;

const merma: StatusMap = {
  activa: { label: mermaStatusLabels.activa, tone: 'primary', icon: Circle },
  asignada: { label: mermaStatusLabels.asignada, tone: 'info', icon: ThumbsUp },
  en_proceso: { label: mermaStatusLabels.en_proceso, tone: 'info', icon: Truck },
  completada: { label: mermaStatusLabels.completada, tone: 'success', icon: CheckCircle2 },
  cancelada: { label: mermaStatusLabels.cancelada, tone: 'muted', icon: Ban },
  vencida: { label: mermaStatusLabels.vencida, tone: 'destructive', icon: AlertTriangle },
  perdida: { label: mermaStatusLabels.perdida, tone: 'destructive', icon: XCircle },
};

const application: StatusMap = {
  pendiente: { label: applicationStatusLabels.pendiente, tone: 'warning', icon: Clock },
  aprobada: { label: applicationStatusLabels.aprobada, tone: 'primary', icon: ThumbsUp },
  rechazada: { label: applicationStatusLabels.rechazada, tone: 'destructive', icon: XCircle },
  cancelada: { label: applicationStatusLabels.cancelada, tone: 'muted', icon: Ban },
};

const assignment: StatusMap = {
  asignada: { label: assignmentStatusLabels.asignada, tone: 'warning', icon: Clock },
  confirmada: { label: assignmentStatusLabels.confirmada, tone: 'primary', icon: CalendarCheck },
  en_camino: { label: assignmentStatusLabels.en_camino, tone: 'info', icon: Truck },
  completada: { label: assignmentStatusLabels.completada, tone: 'success', icon: PackageCheck },
  cancelada: { label: assignmentStatusLabels.cancelada, tone: 'muted', icon: Ban },
  no_show: { label: assignmentStatusLabels.no_show, tone: 'destructive', icon: UserX },
};

const session: StatusMap = {
  programada: { label: sessionStatusLabels.programada, tone: 'warning', icon: Clock },
  confirmada: { label: sessionStatusLabels.confirmada, tone: 'primary', icon: CalendarCheck },
  completada: { label: sessionStatusLabels.completada, tone: 'success', icon: CheckCircle2 },
  cancelada: { label: sessionStatusLabels.cancelada, tone: 'muted', icon: Ban },
  no_show: { label: sessionStatusLabels.no_show, tone: 'destructive', icon: UserX },
};

const maps: Record<StatusKind, StatusMap> = { merma, application, assignment, session };

/** Mapeo único estado → { etiqueta, color, ícono }. Valores desconocidos: gris + texto legible. */
export function statusMeta(kind: StatusKind, value: string | null | undefined): StatusMeta {
  const v = value ?? '';
  const found = maps[kind][v];
  if (found) return found;
  if (__DEV__ && v) console.warn(`[status] estado desconocido para ${kind}: "${v}"`);
  return { label: v ? humanize(v) : 'Sin estado', tone: 'muted', icon: Circle };
}

// ─── Máquina de estados de asignaciones (vista de la organización) ─────────

export type AssignmentAction = 'confirm' | 'start-transit' | 'complete' | 'cancel';

/** Pasos visibles del Stepper */
export const assignmentSteps = ['asignada', 'confirmada', 'en_camino', 'completada'] as const;

/** Acción principal según estado (solo endpoints de acción, nunca editar `status`) */
export function primaryAssignmentAction(status: string): AssignmentAction | null {
  switch (status) {
    case 'asignada':
      return 'confirm';
    case 'confirmada':
      return 'start-transit';
    case 'en_camino':
      return 'complete';
    default:
      return null;
  }
}

export function canCancelAssignment(status: string): boolean {
  return status === 'asignada' || status === 'confirmada' || status === 'en_camino';
}

export function canCancelApplication(status: string): boolean {
  return status === 'pendiente';
}

export const assignmentActionLabels: Record<AssignmentAction, string> = {
  confirm: 'Confirmar que vamos',
  'start-transit': 'Salimos para allá',
  complete: 'Ya lo retiramos',
  cancel: 'No podemos ir',
};

/** ¿La asignación sigue "abierta" (para el dashboard y agrupaciones)? */
export function isOpenAssignment(status: string): boolean {
  return status === 'asignada' || status === 'confirmada' || status === 'en_camino';
}
