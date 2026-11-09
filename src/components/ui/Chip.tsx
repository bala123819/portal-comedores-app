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
  // Seleccionado = verde suave: indica el filtro activo sin competir con el botón primario.
  const color = selected ? colors.accentForeground : colors.mutedForeground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'min-h-10 flex-row items-center gap-1.5 rounded-full border px-4 active:opacity-80',
        selected ? 'border-primary/40 bg-accent' : 'border-border bg-card web:hover:border-primary/30',
        className,
      )}
    >
      {selected ? <Check size={16} color={color} /> : Icon ? <Icon size={16} color={color} /> : null}
      <Text
        className={cn('text-sm font-semibold', selected ? 'text-accent-foreground' : 'text-foreground')}
      >
        {label}
      </Text>
    </Pressable>
  );
}
