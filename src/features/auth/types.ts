import { z } from 'zod';

/**
 * `GET /auth/me`: "usuario actual con roles, permisos y tenant". Forma sin documentar (G-01):
 * se valida lo mínimo y se deja pasar el resto.
 */
const roleSchema = z.union([z.string(), z.looseObject({ name: z.string() })]);
const permissionSchema = z.union([z.string(), z.looseObject({ name: z.string() })]);

export const meSchema = z.looseObject({
  id: z.union([z.string(), z.number()]),
  email: z.string().optional(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  name: z.string().nullish(),
  phone: z.string().nullish(),
  avatar_url: z.string().nullish(),
  roles: z.array(roleSchema).optional(),
  permissions: z.array(permissionSchema).optional(),
  organization_id: z.string().nullish(),
  tenant: z.looseObject({ id: z.union([z.string(), z.number()]).optional(), name: z.string().optional() }).nullish(),
});

export type Me = z.infer<typeof meSchema>;

export function roleNames(me: Me | null | undefined): string[] {
  return (me?.roles ?? []).map((r) => (typeof r === 'string' ? r : r.name));
}

export function permissionNames(me: Me | null | undefined): string[] {
  return (me?.permissions ?? []).map((p) => (typeof p === 'string' ? p : p.name));
}

export function displayName(me: Me | null | undefined): string {
  if (!me) return '';
  const full = [me.first_name, me.last_name].filter(Boolean).join(' ');
  return full || me.name || me.email || '';
}

/**
 * `POST /auth/login` y `/auth/refresh` devuelven el token (forma sin documentar).
 * Aceptamos las variantes habituales de Laravel Sanctum.
 */
export function extractToken(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  for (const k of ['token', 'access_token', 'plainTextToken']) {
    if (typeof d[k] === 'string') return d[k] as string;
  }
  if (d.token && typeof d.token === 'object') return extractToken(d.token);
  return null;
}
