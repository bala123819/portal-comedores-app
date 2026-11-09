import type { ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import { cn } from '@/lib/cn';
import { shadows } from '@/theme/tokens';

interface CardProps extends ViewProps {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  tone?: 'default' | 'accent' | 'warning' | 'destructive' | 'info';
}

const toneClass = {
  default: 'border-border/70 bg-card',
  accent: 'border-primary/15 bg-accent',
  warning: 'border-warning/40 bg-warning/10',
  destructive: 'border-destructive/30 bg-destructive/10',
  info: 'border-info/30 bg-info/10',
};

/**
 * Superficie base. Las tarjetas neutras flotan con una sombra suave; las de tono
 * (avisos) quedan planas para no competir con el contenido.
 */
export function Card({ children, className, onPress, tone = 'default', style, ...props }: CardProps) {
  const classes = cn('rounded-2xl border p-4', toneClass[tone], className);
  const elevation = tone === 'default' ? shadows.md : undefined;
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className={cn(classes, 'active:opacity-90 web:hover:border-primary/30')}
        style={[elevation, style]}
        {...props}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View className={classes} style={[elevation, style]} {...props}>
      {children}
    </View>
  );
}
