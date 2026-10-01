import { z } from 'zod';

/**
 * Usuario de `GET /auth/me` y `POST /auth/login` (`data.user`), según las respuestas reales
 * (docs/bda/02-sesion-perfil-organizacion.md). Se valida lo mínimo y se deja pasar el resto.
 */
export const meSchema = z.looseObject({
  id: z.string(),
  email: z.string(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  full_name: z.string().nullish(),
  phone: z.string().nullish(),
  avatar_url: z.string().nullish(),
  tenant_id: z.string().nullish(),
  tenant: z.looseObject({ id: z.string(), name: z.string(), timezone: z.string().optional() }).nullish(),
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  is_verified: z.boolean().optional(),
  is_active: z.boolean().optional(),
  last_login_at: z.string().nullish(),
  preferences: z.unknown().optional(),
});

export type Me = z.infer<typeof meSchema>;

/** Rol del usuario de la app de organizaciones */
export const ORG_ROLE = 'organization_coordinator';

export function roleNames(me: Me | null | undefined): string[] {
  return me?.roles ?? [];
}

export function permissionNames(me: Me | null | undefined): string[] {
  return me?.permissions ?? [];
}

export function displayName(me: Me | null | undefined): string {
  if (!me) return '';
  return me.full_name || [me.first_name, me.last_name].filter(Boolean).join(' ') || me.email;
}

/** `POST /auth/login` y `/auth/refresh` → `data.access_token` */
export const tokenResponseSchema = z.looseObject({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
});

export function extractToken(data: unknown): string | null {
  const r = tokenResponseSchema.safeParse(data);
  return r.success ? r.data.access_token : null;
}
