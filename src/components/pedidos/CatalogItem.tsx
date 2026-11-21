import {
  Apple,
  Bean,
  Beef,
  Candy,
  Carrot,
  Croissant,
  CupSoda,
  Droplet,
  Egg,
  Fish,
  Milk,
  Minus,
  Package,
  Plus,
  Soup,
  Wheat,
  type LucideIcon,
} from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Badge, Button, Text } from '@/components/ui';
import type { CatalogProduct } from '@/features/pedidos/types';
import { formatNumber } from '@/lib/format';
import { availabilityLabels, label, unitLabels } from '@/lib/labels';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

const MAX_QUANTITY = 9999;

/** "Por paquete (1 kg)", "Por unidad (0,83 kg)" */
function unitDescription(p: CatalogProduct): string {
  const unit = unitLabels[p.unit]?.one ?? p.unit;
  return p.weight_per_unit_kg
    ? `Por ${unit} (${formatNumber(p.weight_per_unit_kg, 2)} kg)`
    : `Por ${unit}`;
}

interface ProductVisual {
  icon: LucideIcon;
  bg: string;
  fg: string;
}

/**
 * El catálogo no trae fotos: cada producto se ilustra con un ícono y un color según su
 * nombre o categoría. Gana la primera regla que coincide, así que lo más específico va arriba.
 */
const VISUALS: { match: RegExp; visual: ProductVisual }[] = [
  { match: /aceite/, visual: { icon: Droplet, bg: '#FDF3D7', fg: '#9A6A06' } },
  { match: /leche|yogur|queso|lacteo/, visual: { icon: Milk, bg: '#E4F0FC', fg: '#1F6FBF' } },
  { match: /huevo/, visual: { icon: Egg, bg: '#FCF1DE', fg: '#A0620C' } },
  { match: /pollo|muslo|pata/, visual: { icon: Beef, bg: '#FCE7E2', fg: '#B23E26' } },
  { match: /pescado|merluza|atun|caballa/, visual: { icon: Fish, bg: '#E2F2F6', fg: '#1C7189' } },
  { match: /carne|picada|bife|cerdo|proteina/, visual: { icon: Beef, bg: '#FCE7E2', fg: '#B23E26' } },
  { match: /lenteja|poroto|garbanzo|arveja|legumbre/, visual: { icon: Bean, bg: '#F3EADF', fg: '#7D5330' } },
  { match: /manzana|banana|naranja|mandarina|fruta/, visual: { icon: Apple, bg: '#FCE6E8', fg: '#BE2F45' } },
  { match: /zanahoria|papa|cebolla|zapallo|tomate|verdura/, visual: { icon: Carrot, bg: '#FDEBDD', fg: '#B7541A' } },
  { match: /pan|galleta|bizcocho/, visual: { icon: Croissant, bg: '#FBEFDC', fg: '#99601A' } },
  { match: /arroz|fideo|harina|polenta|avena|cereal/, visual: { icon: Wheat, bg: '#F8F0D6', fg: '#8A6A12' } },
  { match: /azucar|dulce|mermelada|cacao/, visual: { icon: Candy, bg: '#F6E6F4', fg: '#9B3A8C' } },
  { match: /jugo|bebida|agua|gaseosa/, visual: { icon: CupSoda, bg: '#E4F0FC', fg: '#1F6FBF' } },
  { match: /conserva|pure|salsa|sopa|caldo/, visual: { icon: Soup, bg: '#FDEBDD', fg: '#B7541A' } },
];

const DEFAULT_VISUAL: ProductVisual = {
  icon: Package,
  bg: colors.accent,
  fg: colors.accentForeground,
};

function productVisual(p: CatalogProduct): ProductVisual {
  const text = [p.name, p.category?.name, p.nutritional_group?.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return VISUALS.find((v) => v.match.test(text))?.visual ?? DEFAULT_VISUAL;
}

/**
 * Control −/cantidad/+ compacto para filas de listas (el `NumberStepper` es para formularios).
 * `fill` lo estira al ancho del contenedor (tarjetas del catálogo).
 */
export function QuantityControl({
  value,
  onChange,
  label: a11yLabel,
  fill = false,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  fill?: boolean;
}) {
  const btn = cn(
    'items-center justify-center rounded-full bg-accent active:opacity-80',
    fill ? 'h-10 w-10' : 'h-11 w-11',
  );
  return (
    <View className={cn('flex-row items-center gap-1.5', fill && 'w-full')}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value === 1 ? `Sacar ${a11yLabel}` : `Menos ${a11yLabel}`}
        onPress={() => onChange(value - 1)}
        className={btn}
      >
        <Minus size={20} color={colors.accentForeground} />
      </Pressable>
      {/* Sin line-height ni padding vertical: en iOS/web el lineHeight empuja el texto hacia abajo */}
      <TextInput
        value={String(value)}
        onChangeText={(t) => {
          const n = parseInt(t.replace(/\D/g, ''), 10);
          onChange(Number.isNaN(n) ? 0 : Math.min(MAX_QUANTITY, n));
        }}
        keyboardType="number-pad"
        selectTextOnFocus
        accessibilityLabel={`Cantidad de ${a11yLabel}`}
        textAlignVertical="center"
        className={cn(
          'min-w-0 rounded-lg border border-input bg-card p-0 text-center text-[18px] font-bold text-foreground',
          fill ? 'h-10 flex-1' : 'h-11 w-16',
        )}
        style={{ includeFontPadding: false }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Más ${a11yLabel}`}
        onPress={() => onChange(Math.min(MAX_QUANTITY, value + 1))}
        className={cn(btn, value >= MAX_QUANTITY && 'opacity-40')}
        disabled={value >= MAX_QUANTITY}
      >
        <Plus size={20} color={colors.accentForeground} />
      </Pressable>
    </View>
  );
}

/** Producto del catálogo del Banco (tarjeta vertical de la grilla) con su cantidad en el pedido. */
export const CatalogItem = memo(function CatalogItem({
  product,
  quantity,
  onChange,
}: {
  product: CatalogProduct;
  quantity: number;
  onChange: (product: CatalogProduct, quantity: number) => void;
}) {
  const lowStock = product.availability === 'poco_stock';
  const { icon: Icon, bg, fg } = productVisual(product);
  return (
    <View
      className={cn(
        'gap-3 rounded-xl border bg-card p-3',
        quantity > 0 ? 'border-primary' : 'border-border',
      )}
    >
      <View
        className="h-20 items-center justify-center rounded-lg"
        style={{ backgroundColor: bg }}
      >
        <Icon size={36} color={fg} strokeWidth={1.75} />
        {lowStock ? (
          <Badge
            label={label(availabilityLabels, product.availability)}
            tone="warning"
            size="sm"
            className="absolute left-1.5 top-1.5"
          />
        ) : null}
      </View>
      {/* Alto fijo de dos renglones: así todas las tarjetas de una fila miden lo mismo */}
      <View className="gap-0.5">
        <Text variant="label" numberOfLines={2} className="min-h-10 text-[15px] leading-5">
          {product.name}
        </Text>
        <Text variant="caption" numberOfLines={1} className="text-xs">
          {unitDescription(product)}
        </Text>
      </View>
      {quantity > 0 ? (
        <QuantityControl
          value={quantity}
          onChange={(v) => onChange(product, v)}
          label={product.name}
          fill
        />
      ) : (
        <Button
          title="Agregar"
          icon={Plus}
          variant="secondary"
          size="sm"
          fullWidth
          onPress={() => onChange(product, 1)}
        />
      )}
    </View>
  );
});
