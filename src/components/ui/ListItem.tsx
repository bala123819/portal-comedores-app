import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '@/lib/cn';
import { colors, toneColor, type Tone } from '@/theme/tokens';
import { Text } from './Text';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconTone?: Tone;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  className?: string;
}

export function ListItem({
  title,
  subtitle,
  icon: Icon,
  iconTone = 'accent',
  right,
  onPress,
  chevron = !!onPress,
  className,
}: ListItemProps) {
  const content = (
    <>
      {Icon ? (
        <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
          <Icon size={22} color={toneColor[iconTone]} />
        </View>
      ) : null}
      <View className="flex-1">
        <Text variant="label" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <ChevronRight size={20} color={colors.mutedForeground} /> : null}
    </>
  );
  const classes = cn('min-h-14 flex-row items-center gap-3 rounded-xl bg-card px-3 py-3', className);
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      className={cn(classes, 'active:bg-muted')}
    >
      {content}
    </Pressable>
  ) : (
    <View className={classes}>{content}</View>
  );
}

/** Fila ícono + etiqueta + valor para detalles */
export function InfoRow({
  icon: Icon,
  label,
  value,
  tone = 'muted',
}: {
  icon?: LucideIcon;
  label: string;
  value?: string | null;
  tone?: Tone;
}) {
  if (!value) return null;
  return (
    <View className="flex-row items-start gap-3" accessible accessibilityLabel={`${label}: ${value}`}>
      {Icon ? (
        <View className="mt-0.5">
          <Icon size={20} color={toneColor[tone]} />
        </View>
      ) : null}
      <View className="flex-1">
        <Text variant="caption">{label}</Text>
        <Text>{value}</Text>
      </View>
    </View>
  );
}
