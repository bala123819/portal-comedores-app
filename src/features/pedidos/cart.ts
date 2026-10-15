import { create } from 'zustand';
import type { CatalogProduct } from './types';
import { ORDER_RULES } from './types';

export interface CartLine {
  product: CatalogProduct;
  quantity: number;
}

interface CartState {
  /** Por `product_id`: el banco no acepta productos repetidos en un pedido */
  lines: Record<string, CartLine>;
  /** Cambia la cantidad; 0 la saca. Devuelve false si se pasaría del máximo de productos. */
  setQuantity: (product: CatalogProduct, quantity: number) => boolean;
  clear: () => void;
}

/**
 * Borrador del pedido de mercadería, compartido entre el catálogo (`/pedido/nuevo`) y la
 * confirmación (`/pedido/confirmar`). Vive en memoria: se descarta al enviar o al salir de la app.
 */
export const useCart = create<CartState>((set, get) => ({
  lines: {},
  setQuantity: (product, quantity) => {
    const lines = { ...get().lines };
    const q = Math.max(0, Math.floor(quantity));
    if (q === 0) {
      delete lines[product.product_id];
    } else {
      if (!lines[product.product_id] && Object.keys(lines).length >= ORDER_RULES.maxItems)
        return false;
      lines[product.product_id] = { product, quantity: q };
    }
    set({ lines });
    return true;
  },
  clear: () => set({ lines: {} }),
}));

export function cartLines(lines: Record<string, CartLine>): CartLine[] {
  return Object.values(lines).sort((a, b) => a.product.name.localeCompare(b.product.name));
}

/** Kilos estimados (cantidad × peso por unidad). El banco ajusta las cantidades al aprobar. */
export function cartKg(lines: CartLine[]): number {
  return lines.reduce((acc, l) => acc + l.quantity * (l.product.weight_per_unit_kg ?? 0), 0);
}
