import { CalendarClock, MapPin } from 'lucide-react-native';
import { View } from 'react-native';
import { Card, StatusBadge, Text } from '@/components/ui';
import type { Assignment } from '@/features/asignaciones/types';
import { branchAddress, mermaOrigin } from '@/features/mermas/selectors';
import { formatDay, formatTimeRange } from '@/lib/format';
import { colors } from '@/theme/tokens';

export function AssignmentCard({ assignment, onPress }: { assignment: Assignment; onPress: () => void }) {
  const m = assignment.merma;
  const address = m ? branchAddress(m) : null;
  return (
    <Card onPress={onPress} className="gap-3" accessibilityLabel={`Retiro ${m?.title ?? ''}`}>
      <StatusBadge kind="assignment" status={assignment.status} size="sm" />
      <View className="gap-1">
        <Text variant="heading" numberOfLines={2}>
          {m?.title ?? 'Retiro'}
        </Text>
        {m ? (
          <Text variant="caption" numberOfLines={1}>
            {mermaOrigin(m)}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center gap-2">
        <CalendarClock size={18} color={colors.mutedForeground} />
        <Text className="flex-1 text-sm">
          {formatDay(assignment.scheduled_pickup_date)}{' '}
          {formatTimeRange(assignment.scheduled_pickup_time_start, assignment.scheduled_pickup_time_end)}
        </Text>
      </View>
      {address ? (
        <View className="flex-row items-center gap-2">
          <MapPin size={18} color={colors.mutedForeground} />
          <Text className="flex-1 text-sm" numberOfLines={1}>
            {address}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
