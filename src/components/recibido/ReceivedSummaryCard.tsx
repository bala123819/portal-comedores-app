import { Package } from 'lucide-react-native';
import { View } from 'react-native';
import { Card, ProgressBar, Text } from '@/components/ui';
import { monthLabel } from '@/features/recibido/period';
import type { ReceivedKind, ReceivedSummary } from '@/features/recibido/types';
import { formatDate, formatDay, formatNumber } from '@/lib/format';
import { receivedKindLabels } from '@/lib/labels';
import { colors } from '@/theme/tokens';

const KINDS: ReceivedKind[] = ['distribution', 'merma'];

/** Resumen de "Lo recibido" para el período entero: kilos, entregas, por origen y por mes. */
export function ReceivedSummaryCard({ summary }: { summary: ReceivedSummary }) {
  const months = summary.by_month ?? [];
  const maxMonthKg = Math.max(...months.map((m) => m.kg), 0);
  const kinds = KINDS.filter((k) => (summary.by_kind?.[k]?.count ?? 0) > 0);

  return (
    <Card className="gap-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-accent">
          <Package size={20} color={colors.accentForeground} />
        </View>
        <View className="flex-1">
          <Text variant="caption">
            Del {formatDate(summary.period.from)} al {formatDate(summary.period.to)}
          </Text>
          <Text variant="title">{formatNumber(summary.total_kg)} kg</Text>
          <Text variant="caption">
            {summary.total_count === 1 ? '1 entrega recibida' : `${formatNumber(summary.total_count, 0)} entregas recibidas`}
            {summary.last_received_date ? ` · la última, ${formatDay(summary.last_received_date)}` : ''}
          </Text>
        </View>
      </View>

      {kinds.length ? (
        <View className="gap-1">
          {kinds.map((k) => {
            const t = summary.by_kind[k]!;
            return (
              <View key={k} className="flex-row justify-between gap-3">
                <Text className="flex-1 text-sm">{receivedKindLabels[k]}</Text>
                <Text className="text-sm font-semibold">
                  {formatNumber(t.kg)} kg · {t.count === 1 ? '1 entrega' : `${formatNumber(t.count, 0)} entregas`}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {months.length > 1 ? (
        <View className="gap-2">
          <Text variant="label">Por mes</Text>
          {months.map((m) => (
            <View
              key={m.month}
              className="gap-1"
              accessible
              accessibilityLabel={`${monthLabel(m.month)}: ${formatNumber(m.kg)} kilos`}
            >
              <View className="flex-row justify-between">
                <Text className="text-sm">{monthLabel(m.month, true, true)}</Text>
                <Text className="text-sm font-semibold">{formatNumber(m.kg)} kg</Text>
              </View>
              <ProgressBar value={maxMonthKg ? m.kg / maxMonthKg : 0} />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
