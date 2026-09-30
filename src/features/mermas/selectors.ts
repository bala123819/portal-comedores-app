import type { Merma } from './types';

/**
 * Accesos tolerantes a la forma de la respuesta (sin documentar, G-01): la relación puede venir
 * anidada (`donor`, `donor_branch`) o solo con ids.
 */
export function donorName(m: Merma): string | null {
  return m.donor?.name ?? null;
}

export function branchName(m: Merma): string | null {
  return m.donor_branch?.name ?? null;
}

export function branchAddress(m: Merma): string | null {
  const b = m.donor_branch;
  if (!b) return null;
  return [b.address, b.city, b.province ?? b.state].filter(Boolean).join(', ') || null;
}

export function mermaOrigin(m: Merma): string {
  return [donorName(m), branchName(m)].filter(Boolean).join(' · ') || 'Donante';
}

export function mapsUrl(m: Merma): string | null {
  const b = m.donor_branch;
  if (!b) return null;
  if (b.latitude != null && b.longitude != null)
    return `https://www.google.com/maps/search/?api=1&query=${b.latitude},${b.longitude}`;
  const addr = branchAddress(m);
  return addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` : null;
}

/** Requisitos logísticos legibles */
export function mermaRequirements(m: Merma): string[] {
  const out: string[] = [];
  if (m.requires_refrigerated_transport) out.push('Necesita transporte con frío');
  if (m.requires_gel_coolers) out.push('Llevar conservadoras con geles');
  if (m.requires_loading_help) out.push('Hace falta ayuda para cargar');
  if (m.returnable_containers) out.push('Hay que devolver los envases');
  for (const r of m.special_requirements ?? []) if (r) out.push(r);
  return out;
}

/** Cantidad disponible de un producto (cantidad − ya asignada) */
export function availableQuantity(p: { quantity: number; quantity_assigned?: number | null }) {
  return Math.max(0, p.quantity - (p.quantity_assigned ?? 0));
}
