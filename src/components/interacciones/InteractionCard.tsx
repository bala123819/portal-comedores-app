import { CircleHelp, MessageSquareWarning, PackagePlus, Zap, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { Card, StatusBadge, Text } from '@/components/ui';
import type { Interaction } from '@/features/interacciones/types';
import { formatRelative } from '@/lib/format';
import { interactionTypeLabels, label } from '@/lib/labels';
import { colors } from '@/theme/tokens';

export const interactionTypeIcons: Record<string, LucideIcon> = {
  suceso: Zap,
  solicitud: PackagePlus,
  consulta: CircleHelp,
  reclamo: MessageSquareWarning,
};

export function interactionTypeLabel(i: Pick<Interaction, 'interaction_type' | 'type_label'>): string {
  return i.type_label || label(interactionTypeLabels, i.interaction_type);
}

/** Ícono del tipo en un círculo del color de acento (mismo tratamiento que familias) */
export function InteractionTypeIcon({ type, size = 'md' }: { type: string; size?: 'md' | 'lg' }) {
  const Icon = interactionTypeIcons[type] ?? CircleHelp;
  return (
    <View
      className={size === 'lg' ? 'h-14 w-14 items-center justify-center rounded-full bg-accent' : 'h-11 w-11 items-center justify-center rounded-full bg-accent'}
    >
      <Icon size={size === 'lg' ? 28 : 22} color={colors.accentForeground} />
    </View>
  );
}

export function InteractionCard({ interaction: i, onPress }: { interaction: Interaction; onPress?: () => void }) {
  const type = interactionTypeLabel(i);
  return (
    <Card onPress={onPress} className="flex-row items-start gap-3" accessibilityLabel={`${type}: ${i.title}`}>
      <InteractionTypeIcon type={String(i.interaction_type)} />
      <View className="flex-1 gap-1">
        <Text variant="label" numberOfLines={2}>
          {i.title}
        </Text>
        {i.notes ? (
          <Text className="text-sm" tone="muted" numberOfLines={2}>
            {i.notes}
          </Text>
        ) : null}
        <View className="flex-row flex-wrap items-center gap-2 pt-1">
          <StatusBadge kind="interaction" status={i.status} size="sm" />
          <Text variant="caption">
            {[type, formatRelative(i.created_at)].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
    </Card>
  );
}
