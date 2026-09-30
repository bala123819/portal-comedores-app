import { CalendarClock, MapPin, Package, Snowflake, TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';
import { Badge, Card, Text } from '@/components/ui';
import { mermaOrigin } from '@/features/mermas/selectors';
import type { Merma } from '@/features/mermas/types';
import { formatDay, formatDeadline, formatNumber, formatTimeRange } from '@/lib/format';
import { priorityLabels, label } from '@/lib/labels';
import { colors } from '@/theme/tokens';

export function MermaCard({ merma, onPress }: { merma: Merma; onPress: () => void }) {
  const deadline = formatDeadline(merma.deadline);
  const productos = merma.total_products ?? merma.products?.length ?? 0;
  const urgent = merma.is_urgent || merma.priority === 'critica' || deadline.urgent;

  return (
    <Card onPress={onPress} accessibilityLabel={`${merma.title}. ${mermaOrigin(merma)}`} className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {urgent ? <Badge label="Urgente" tone="warning" icon={TriangleAlert} size="sm" /> : null}
        {merma.priority && merma.priority !== 'normal' && merma.priority !== 'critica' ? (
          <Badge label={label(priorityLabels, merma.priority)} tone="muted" size="sm" />
        ) : null}
        {merma.requires_refrigerated_transport ? (
          <Badge label="Necesita frío" tone="info" icon={Snowflake} size="sm" />
        ) : null}
      </View>

      <View className="gap-1">
        <Text variant="heading" numberOfLines={2}>
          {merma.title}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {mermaOrigin(merma)}
        </Text>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <CalendarClock size={18} color={colors.mutedForeground} />
          <Text className="flex-1 text-sm">
            Retirar {formatDay(merma.pickup_date)} {formatTimeRange(merma.pickup_time_start, merma.pickup_time_end)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Package size={18} color={colors.mutedForeground} />
          <Text className="flex-1 text-sm">
            {productos} {productos === 1 ? 'producto' : 'productos'}
            {merma.total_kg ? ` · ${formatNumber(merma.total_kg)} kg` : ''}
          </Text>
        </View>
        {merma.distance_km != null ? (
          <View className="flex-row items-center gap-2">
            <MapPin size={18} color={colors.mutedForeground} />
            <Text className="flex-1 text-sm">A {formatNumber(merma.distance_km)} km</Text>
          </View>
        ) : null}
      </View>

      <Text
        className={deadline.urgent || deadline.expired ? 'text-sm font-semibold text-destructive' : 'text-sm text-muted-foreground'}
      >
        {deadline.text}
      </Text>
    </Card>
  );
}
