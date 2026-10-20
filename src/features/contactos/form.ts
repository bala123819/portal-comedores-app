import { z } from 'zod';
import type { ContactBody, OrganizationContact } from './types';

/** Campos de `POST/PUT /org/contacts`: name*, position, phone, email, dni, is_primary */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Escribí nombre y apellido').max(255, 'Hasta 255 caracteres'),
  position: z.string().trim().max(100, 'Hasta 100 caracteres'),
  phone: z.string().trim().max(50, 'Hasta 50 caracteres'),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Revisá el email'),
  // El backend acepta "99.000.005" y guarda sólo números; la app ya escribe sólo números
  dni: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{7,8}$/.test(v), 'El DNI tiene 7 u 8 números'),
  is_primary: z.boolean(),
});
export type ContactValues = z.infer<typeof contactSchema>;

export const emptyContact = (): ContactValues => ({
  name: '',
  position: '',
  phone: '',
  email: '',
  dni: '',
  is_primary: false,
});

export const contactToValues = (c: OrganizationContact): ContactValues => ({
  name: c.name ?? '',
  position: c.position ?? '',
  phone: c.phone ?? '',
  email: c.email ?? '',
  dni: c.dni ?? '',
  is_primary: !!c.is_primary,
});

export function contactBody(v: ContactValues): ContactBody {
  return {
    name: v.name.trim(),
    position: v.position.trim() || null,
    phone: v.phone.trim() || null,
    email: v.email.trim() || null,
    dni: v.dni.trim() || null,
    is_primary: v.is_primary,
  };
}

/** Texto de la solicitud al Banco para que autorice a una persona a retirar (post 4/14 → post 8/14) */
export function authorizationRequest(c: Pick<OrganizationContact, 'name' | 'dni' | 'position'>) {
  return {
    tipo: 'solicitud',
    titulo: `Autorizar a ${c.name} a retirar alimentos`,
    notas: [
      `Pedimos que autoricen a ${c.name} (DNI ${c.dni}) a retirar alimentos en nombre de la organización.`,
      c.position ? `Cargo: ${c.position}.` : null,
      'Ya está cargada en los contactos de la organización.',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
