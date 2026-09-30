import type { ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import { cn } from '@/lib/cn';

interface CardProps extends ViewProps {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  tone?: 'default' | 'accent' | 'warning' | 'destructive' | 'info';
}

const toneClass = {
  default: 'border-border bg-card',
  accent: 'border-accent bg-accent',
  warning: 'border-warning/40 bg-warning/10',
  destructive: 'border-destructive/40 bg-destructive/10',
  info: 'border-info/40 bg-info/10',
};

export function Card({ children, className, onPress, tone = 'default', ...props }: CardProps) {
  const classes = cn('rounded-xl border p-4', toneClass[tone], className);
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className={cn(classes, 'active:opacity-80')}
        {...props}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View className={classes} {...props}>
      {children}
    </View>
  );
}
