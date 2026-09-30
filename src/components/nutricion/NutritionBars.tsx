import { View } from 'react-native';
import { ProgressBar, StatCard, Text } from '@/components/ui';
import { barsFromSummary, statsFromObject } from '@/features/nutricion/summary';
import type { NutritionalGroup } from '@/features/nutricion/types';
import { formatNumber } from '@/lib/format';
import { nutritionalGroupLabels } from '@/lib/labels';

/**
 * Resumen nutricional visual: barras por grupo (proporción sobre el total) y totales.
 * Si la API manda el color del grupo, se usa; si no, el primario.
 */
export function NutritionBars({
  data,
  groups,
  showStats = true,
}: {
  data: unknown;
  groups?: NutritionalGroup[];
  showStats?: boolean;
}) {
  const bars = barsFromSummary(data);
  const stats = showStats ? statsFromObject(data).slice(0, 4) : [];
  const max = Math.max(...bars.map((b) => b.value), 0);

  if (!bars.length && !stats.length) {
    return <Text tone="muted">No hay datos nutricionales para mostrar.</Text>;
  }

  return (
    <View className="gap-4">
      {stats.length ? (
        <View className="flex-row flex-wrap gap-3">
          {stats.map((s) => (
            <StatCard key={s.key} label={s.label} value={`${formatNumber(s.value)}${s.unit ? ` ${s.unit}` : ''}`} />
          ))}
        </View>
      ) : null}
      {bars.map((b) => {
        const group = groups?.find((g) => g.code === b.key || g.name === b.label);
        const name = group?.name ?? (nutritionalGroupLabels[b.key] || b.label);
        return (
          <View key={b.key} className="gap-1.5" accessible accessibilityLabel={`${name}: ${formatNumber(b.value)} ${b.unit}`}>
            <View className="flex-row justify-between">
              <Text variant="label" className="flex-1">
                {name}
              </Text>
              <Text className="text-sm font-semibold">
                {formatNumber(b.value)} {b.unit}
              </Text>
            </View>
            <ProgressBar value={max ? b.value / max : 0} color={group?.color ?? b.color} />
          </View>
        );
      })}
    </View>
  );
}
