import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

const containerClass: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-accent',
  outline: 'border border-border bg-card',
  ghost: 'bg-transparent',
  destructive: 'bg-destructive',
};

const textClass: Record<ButtonVariant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-accent-foreground',
  outline: 'text-foreground',
  ghost: 'text-primary',
  destructive: 'text-destructive-foreground',
};

const iconColor: Record<ButtonVariant, string> = {
  primary: colors.primaryForeground,
  secondary: colors.accentForeground,
  outline: colors.foreground,
  ghost: colors.primary,
  destructive: colors.primaryForeground,
};

const sizeClass: Record<Size, string> = {
  sm: 'min-h-10 px-3 rounded-md',
  md: 'min-h-12 px-4 rounded-lg',
  lg: 'min-h-14 px-5 rounded-xl',
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading,
  disabled,
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const iconSize = size === 'lg' ? 22 : 20;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? 4 : undefined}
      className={cn(
        'flex-row items-center justify-center gap-2 active:opacity-80',
        containerClass[variant],
        sizeClass[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={iconColor[variant]} />
      ) : (
        Icon && <Icon size={iconSize} color={iconColor[variant]} />
      )}
      <Text
        variant="label"
        className={cn(textClass[variant], size === 'lg' && 'text-lg', 'text-center')}
        numberOfLines={2}
      >
        {title}
      </Text>
      {IconRight && !loading ? <IconRight size={iconSize} color={iconColor[variant]} /> : null}
    </Pressable>
  );
}

/** Botón de ícono solo (48×48). `label` es obligatorio para accesibilidad. */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  color = colors.foreground,
  badge,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  color?: string;
  badge?: number;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label} (${badge})` : label}
      onPress={onPress}
      className={cn('h-12 w-12 items-center justify-center rounded-full active:bg-muted', className)}
    >
      <Icon size={24} color={color} />
      {badge ? (
        <View className="absolute right-1 top-1 min-w-5 items-center justify-center rounded-full bg-destructive px-1">
          <Text className="text-xs font-bold text-destructive-foreground">
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
