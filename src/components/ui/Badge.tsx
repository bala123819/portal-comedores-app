import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { cn } from '@/lib/cn';
import { statusMeta, type StatusKind } from '@/lib/status';
import { toneColor, type Tone } from '@/theme/tokens';
import { Text } from './Text';

const toneBg: Record<Tone, string> = {
  primary: 'bg-primary/15 border-primary/30',
  accent: 'bg-accent border-accent',
  success: 'bg-success/15 border-success/30',
  warning: 'bg-warning/25 border-warning/50',
  info: 'bg-info/15 border-info/30',
  destructive: 'bg-destructive/15 border-destructive/30',
  muted: 'bg-muted border-border',
};

export interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
  size?: 'sm' | 'md';
}

/** El color nunca va solo: siempre ícono y/o texto. */
export function Badge({ label, tone = 'muted', icon: Icon, className, size = 'md' }: BadgeProps) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5 self-start rounded-full border',
        size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1',
        toneBg[tone],
        className,
      )}
      accessible
      accessibilityLabel={label}
    >
      {Icon ? <Icon size={size === 'sm' ? 14 : 16} color={toneColor[tone]} /> : null}
      <Text className={cn('font-semibold text-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {label}
      </Text>
    </View>
  );
}

export function StatusBadge({
  kind,
  status,
  size,
  className,
}: {
  kind: StatusKind;
  status: string | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const meta = statusMeta(kind, status);
  return (
    <Badge label={meta.label} tone={meta.tone} icon={meta.icon} size={size} className={className} />
  );
}
