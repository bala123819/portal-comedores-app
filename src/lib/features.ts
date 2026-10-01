/**
 * Módulos de la app según lo que el backend del Banco ofrece HOY (docs/bda/01-guia.md §3 y §6).
 *
 * - Con la API real sólo se activan los módulos probados por el Banco.
 * - En modo mocks (EXPO_PUBLIC_USE_MOCKS=true) se activa todo: sirve de prototipo para la tesis
 *   y deja las pantallas listas para cuando el backend las habilite.
 * - EXPO_PUBLIC_ENABLE_MODULES=mermas,programas,... fuerza módulos puntuales (p. ej. si el Banco
 *   habilita uno nuevo) sin tocar código.
 * - EXPO_PUBLIC_MODULES_SCOPE=real hace que los mocks muestren sólo lo que existe hoy en el backend
 *   (sirve para probar la app "como en producción" sin credenciales).
 *
 * Nunca llamar a un endpoint de un módulo apagado: un 403 del banco "es un bug de la app".
 */
import { env } from './env';

export type Module =
  /** Mermas disponibles, pedidos (postulaciones), retiros (asignaciones), quién retira */
  | 'mermas'
  /** Alta y edición de familias */
  | 'familiasAlta'
  /** Contactos de la organización y autorizaciones de retiro */
  | 'contactos'
  /** Requerimientos, documentos, ficha social, carta compromiso */
  | 'documentacion'
  /** Jornadas de recolección y talleres */
  | 'programas'
  /** Endpoints de nutrición y productos (/nutrition, /nutritional-groups, /unified-products) */
  | 'nutricionApi';

const forced = new Set(
  (process.env.EXPO_PUBLIC_ENABLE_MODULES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

const mocksShowEverything = env.useMocks && process.env.EXPO_PUBLIC_MODULES_SCOPE !== 'real';

export function isEnabled(module: Module): boolean {
  return mocksShowEverything || forced.has(module);
}

export const features = {
  mermas: isEnabled('mermas'),
  familiasAlta: isEnabled('familiasAlta'),
  contactos: isEnabled('contactos'),
  documentacion: isEnabled('documentacion'),
  programas: isEnabled('programas'),
  nutricionApi: isEnabled('nutricionApi'),
};
