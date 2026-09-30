import { Check, type LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export function Chip({ label, selected, onPress, icon: Icon, className }: ChipProps) {
  const color = selected ? colors.primaryForeground : colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'min-h-10 flex-row items-center gap-1.5 rounded-full border px-4 active:opacity-80',
        selected ? 'border-primary bg-primary' : 'border-border bg-card',
        className,
      )}
    >
      {selected ? <Check size={16} color={color} /> : Icon ? <Icon size={16} color={color} /> : null}
      <Text
        className={cn('text-sm font-semibold', selected ? 'text-primary-foreground' : 'text-foreground')}
      >
        {label}
      </Text>
    </Pressable>
  );
}
