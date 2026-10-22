import { CalendarCheck, FileText, Recycle, Truck } from 'lucide-react-native';
import { View } from 'react-native';
import { Badge, Card, Text } from '@/components/ui';
import type { ReceivedItem } from '@/features/recibido/types';
import { formatDay, formatNumber, formatQuantity } from '@/lib/format';
import { label, receivedOriginLabels } from '@/lib/labels';
import { colors } from '@/theme/tokens';

/**
 * Una entrega recibida (pedido entregado o merma retirada) en "Lo recibido".
 * Muestra hasta 3 productos (`items_preview`) y cuántos más hay.
 */
export function ReceivedCard({ item, onPress }: { item: ReceivedItem; onPress?: () => void }) {
  const isMerma = item.kind === 'merma';
  const Icon = isMerma ? Recycle : Truck;
  const origin = item.origin?.label || label(receivedOriginLabels, item.origin?.tag);

  return (
    <Card
      onPress={onPress}
      className="gap-3"
      accessibilityLabel={`${origin}${item.number ? ` ${item.number}` : ''}, ${formatNumber(item.kg)} kilos, ${formatDay(item.date)}`}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-accent">
          <Icon size={20} color={colors.accentForeground} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text variant="label" numberOfLines={1}>
            {item.number ?? origin}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <CalendarCheck size={14} color={colors.mutedForeground} />
            <Text variant="caption">Recibido {formatDay(item.date)}</Text>
          </View>
        </View>
        <Text variant="heading">{formatNumber(item.kg)} kg</Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Badge label={origin} tone={isMerma ? 'info' : 'accent'} size="sm" />
      </View>

      {item.items_preview?.length ? (
        <View className="gap-1">
          {item.items_preview.map((p, i) => (
            <View key={`${p.name}-${i}`} className="flex-row justify-between gap-3">
              <Text className="flex-1 text-sm" numberOfLines={1}>
                {p.name}
              </Text>
              <Text className="text-sm" tone="muted">
                {formatQuantity(p.quantity, p.unit)}
              </Text>
            </View>
          ))}
          {item.more_items > 0 ? (
            <Text variant="caption">
              {item.more_items === 1 ? 'y 1 producto más' : `y ${formatNumber(item.more_items, 0)} productos más`}
            </Text>
          ) : null}
        </View>
      ) : null}

      {item.receipt_number ? (
        <View className="flex-row items-center gap-1.5">
          <FileText size={14} color={colors.mutedForeground} />
          <Text variant="caption">Remito {item.receipt_number}</Text>
        </View>
      ) : null}
    </Card>
  );
}
