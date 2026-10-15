import {
  AlertTriangle,
  Ban,
  CalendarCheck,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  PackageCheck,
  PackageOpen,
  Store,
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
  distributionStatusLabels,
  humanize,
  interactionStatusLabels,
  mermaStatusLabels,
  sessionStatusLabels,
} from './labels';

export type StatusKind =
  | 'merma'
  | 'application'
  | 'assignment'
  | 'session'
  | 'interaction'
  | 'distribution';

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

const interaction: StatusMap = {
  pendiente: { label: interactionStatusLabels.pendiente, tone: 'warning', icon: Clock },
  atendida: { label: interactionStatusLabels.atendida, tone: 'success', icon: CheckCircle2 },
};

const d = distributionStatusLabels;
const distribution: StatusMap = {
  pendiente: { label: d.pendiente, tone: 'warning', icon: Clock },
  en_revision: { label: d.en_revision, tone: 'warning', icon: Eye },
  aprobada: { label: d.aprobada, tone: 'primary', icon: ThumbsUp },
  programada: { label: d.programada, tone: 'info', icon: CalendarCheck },
  en_preparacion: { label: d.en_preparacion, tone: 'info', icon: PackageOpen },
  lista_para_retiro: { label: d.lista_para_retiro, tone: 'success', icon: Store },
  distribuida: { label: d.distribuida, tone: 'success', icon: PackageCheck },
  rechazada: { label: d.rechazada, tone: 'destructive', icon: XCircle },
  cancelada: { label: d.cancelada, tone: 'muted', icon: Ban },
  anulada: { label: d.anulada, tone: 'muted', icon: Ban },
};

const maps: Record<StatusKind, StatusMap> = {
  merma,
  application,
  assignment,
  session,
  interaction,
  distribution,
};

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

// ─── Pedidos de mercadería (vista de la organización) ──────────────────────

/** Pasos visibles del Stepper. `programada` y `en_preparacion` se muestran como "Armando". */
export const distributionSteps = [
  { key: 'pendiente', label: 'Enviado' },
  { key: 'aprobada', label: 'Aprobado' },
  { key: 'en_preparacion', label: 'Armando' },
  { key: 'lista_para_retiro', label: 'Para retirar' },
  { key: 'distribuida', label: 'Entregado' },
];

const distributionStepIndex: Record<string, number> = {
  pendiente: 0,
  en_revision: 0,
  aprobada: 1,
  programada: 2,
  en_preparacion: 2,
  lista_para_retiro: 3,
  distribuida: 4,
};

/** Índice del paso actual, o `null` si el pedido terminó fuera del flujo (rechazado, cancelado…). */
export function distributionStepOf(status: string): number | null {
  return distributionStepIndex[status] ?? null;
}

/** ¿El pedido sigue en curso? (lo mismo que `status=abiertos` de la API) */
export function isOpenDistribution(status: string): boolean {
  return status in distributionStepIndex && status !== 'distribuida';
}

/** ¿La asignación sigue "abierta" (para el dashboard y agrupaciones)? */
export function isOpenAssignment(status: string): boolean {
  return status === 'asignada' || status === 'confirmada' || status === 'en_camino';
}
