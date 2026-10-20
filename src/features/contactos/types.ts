/**
 * Contactos de la organización (padrón), según las respuestas REALES de `/org/contacts`
 * (docs/bda/04-contactos.md, post 4/14). No están en el OpenAPI: los tipos se escriben a mano.
 *
 * Autorizar a alguien a retirar lo hace el Banco: la app sólo lo muestra y lo pide con una
 * interacción de tipo `solicitud`.
 */
import { isApiError } from '@/services/api/errors';

/** Ámbito y vigencia de una autorización del Banco para retirar */
export interface ContactAuthorization {
  scope_type: 'all' | 'donor' | 'donor_zone' | 'branch' | string;
  valid_from?: string | null;
  valid_until?: string | null;
}

export interface OrganizationContact {
  id: string;
  name: string;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Se guarda sólo con números ("99.000.005" → "99000005") */
  dni?: string | null;
  /** Contacto principal: hay uno solo por organización */
  is_primary?: boolean;
  /** El Banco la autorizó a retirar: nombre y DNI quedan fijos */
  pickup_authorized?: boolean;
  authorizations?: ContactAuthorization[];
}

/** Body de `POST /org/contacts` y `PUT /org/contacts/{id}` (en el PUT van sólo los campos que cambian) */
export interface ContactBody {
  name?: string;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  dni?: string | null;
  is_primary?: boolean;
}

export type ContactErrorCode =
  'CONTACT_IDENTITY_LOCKED' | 'CONTACT_NOT_FOUND' | 'CONTACT_DECLARED_FOR_PICKUP';

export const isContactError = (e: unknown, code: ContactErrorCode) =>
  isApiError(e) && e.code === code;

/** Mensaje para los errores de negocio de contactos (se ramifica por `error_code`, no por el texto). */
export function contactErrorMessage(e: unknown): string | null {
  if (!isApiError(e)) return null;
  switch (e.code) {
    case 'CONTACT_IDENTITY_LOCKED':
      return 'Esta persona está autorizada por el Banco para retirar: no se le puede cambiar el nombre ni el DNI. Si es otra persona, cargala como contacto nuevo y pedile al Banco que la autorice.';
    case 'CONTACT_NOT_FOUND':
      return 'No encontramos a esta persona. Puede que ya la hayan dado de baja.';
    case 'CONTACT_DECLARED_FOR_PICKUP':
      return 'Esta persona está declarada para retirar una merma en curso. Sacala de ese retiro primero.';
  }
  if (e.kind === 'forbidden')
    return 'Tu usuario no tiene permiso para cambiar contactos. Pedíselo al Banco de Alimentos.';
  return null;
}

/** Autorización vigente hoy (sin fechas = sin límite) */
export function isAuthorizationActive(a: ContactAuthorization, today = new Date()): boolean {
  const day = today.toISOString().slice(0, 10);
  if (a.valid_from && a.valid_from.slice(0, 10) > day) return false;
  if (a.valid_until && a.valid_until.slice(0, 10) < day) return false;
  return true;
}
