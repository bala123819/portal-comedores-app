import { View } from 'react-native';
import { Card, StatusBadge, Text } from '@/components/ui';
import { mermaOrigin } from '@/features/mermas/selectors';
import type { Application } from '@/features/postulaciones/types';
import { formatRelative } from '@/lib/format';

export function ApplicationCard({ application, onPress }: { application: Application; onPress: () => void }) {
  const m = application.merma;
  return (
    <Card onPress={onPress} className="gap-2" accessibilityLabel={`Pedido ${m?.title ?? ''}`}>
      <StatusBadge kind="application" status={application.status} size="sm" />
      <Text variant="heading" numberOfLines={2}>
        {m?.title ?? 'Pedido de alimentos'}
      </Text>
      <View className="flex-row flex-wrap justify-between gap-2">
        {m ? (
          <Text variant="caption" numberOfLines={1} className="flex-1">
            {mermaOrigin(m)}
          </Text>
        ) : null}
        {application.created_at ? (
          <Text variant="caption">Pedido {formatRelative(application.created_at)}</Text>
        ) : null}
      </View>
    </Card>
  );
}
