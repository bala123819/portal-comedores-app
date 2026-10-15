import { AlertTriangle, CalendarClock, Package } from 'lucide-react-native';
import { View } from 'react-native';
import { Card, StatusBadge, Text } from '@/components/ui';
import type { Distribution } from '@/features/pedidos/types';
import { formatDay, formatNumber, formatRelative } from '@/lib/format';
import { colors } from '@/theme/tokens';

/** Tarjeta de un pedido de mercadería en los listados (el listado no trae `items`). */
export function DistributionCard({
  distribution: d,
  onPress,
}: {
  distribution: Distribution;
  onPress: () => void;
}) {
  const pickupDate = d.scheduled_distribution_date ?? d.requested_distribution_date;
  return (
    <Card onPress={onPress} className="gap-2" accessibilityLabel={`Pedido ${d.number}`}>
      <View className="flex-row flex-wrap items-center gap-2">
        <StatusBadge kind="distribution" status={d.status} size="sm" />
        {d.is_urgent ? (
          <View className="flex-row items-center gap-1">
            <AlertTriangle size={14} color={colors.destructive} />
            <Text variant="caption" tone="destructive">
              Urgente
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="heading" numberOfLines={1}>
        Pedido {d.number}
      </Text>
      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        <View className="flex-row items-center gap-1.5">
          <Package size={16} color={colors.mutedForeground} />
          <Text variant="caption">
            {d.total_items === 1 ? '1 producto' : `${formatNumber(d.total_items ?? 0)} productos`} ·{' '}
            {formatNumber(d.total_kg ?? 0)} kg
          </Text>
        </View>
        {pickupDate ? (
          <View className="flex-row items-center gap-1.5">
            <CalendarClock size={16} color={colors.mutedForeground} />
            <Text variant="caption">
              {d.actual_distribution_date
                ? `Retirado ${formatDay(d.actual_distribution_date)}`
                : `Retiro ${formatDay(pickupDate)}`}
            </Text>
          </View>
        ) : null}
      </View>
      {d.created_at ? <Text variant="caption">Pedido {formatRelative(d.created_at)}</Text> : null}
    </Card>
  );
}
