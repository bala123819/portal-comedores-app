import { Minus, Plus } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Badge, Button, Text } from '@/components/ui';
import type { CatalogProduct } from '@/features/pedidos/types';
import { formatNumber } from '@/lib/format';
import { availabilityLabels, label, unitLabels } from '@/lib/labels';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

const MAX_QUANTITY = 9999;

/** "paquete de 1 kg", "unidad de 0,83 kg" */
function unitDescription(p: CatalogProduct): string {
  const unit = unitLabels[p.unit]?.one ?? p.unit;
  return p.weight_per_unit_kg
    ? `Por ${unit} (${formatNumber(p.weight_per_unit_kg, 2)} kg)`
    : `Por ${unit}`;
}

/** Control −/cantidad/+ compacto para filas de listas (el `NumberStepper` es para formularios). */
export function QuantityControl({
  value,
  onChange,
  label: a11yLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const btn = 'h-11 w-11 items-center justify-center rounded-full bg-accent active:opacity-80';
  return (
    <View className="flex-row items-center gap-1.5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value === 1 ? `Sacar ${a11yLabel}` : `Menos ${a11yLabel}`}
        onPress={() => onChange(value - 1)}
        className={btn}
      >
        <Minus size={20} color={colors.accentForeground} />
      </Pressable>
      <TextInput
        value={String(value)}
        onChangeText={(t) => {
          const n = parseInt(t.replace(/\D/g, ''), 10);
          onChange(Number.isNaN(n) ? 0 : Math.min(MAX_QUANTITY, n));
        }}
        keyboardType="number-pad"
        selectTextOnFocus
        accessibilityLabel={`Cantidad de ${a11yLabel}`}
        className="min-h-11 w-16 rounded-lg border border-input bg-card text-center text-lg font-bold text-foreground"
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

/** Producto del catálogo del Banco con su cantidad en el pedido que se está armando. */
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
  return (
    <View
      className={cn(
        'gap-3 rounded-xl border bg-card p-4',
        quantity > 0 ? 'border-primary' : 'border-border',
      )}
    >
      <View className="gap-1">
        <Text variant="label">{product.name}</Text>
        <Text variant="caption">
          {[product.category?.name, unitDescription(product)].filter(Boolean).join(' · ')}
        </Text>
        {lowStock ? (
          <Badge
            label={label(availabilityLabels, product.availability)}
            tone="warning"
            size="sm"
            className="mt-1"
          />
        ) : null}
      </View>
      <View className="flex-row items-center justify-end">
        {quantity > 0 ? (
          <QuantityControl
            value={quantity}
            onChange={(v) => onChange(product, v)}
            label={product.name}
          />
        ) : (
          <Button
            title="Agregar"
            icon={Plus}
            variant="secondary"
            size="sm"
            onPress={() => onChange(product, 1)}
          />
        )}
      </View>
    </View>
  );
});
