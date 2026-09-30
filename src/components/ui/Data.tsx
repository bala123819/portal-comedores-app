import { Check, X, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { cn } from '@/lib/cn';
import { colors, toneColor, type Tone } from '@/theme/tokens';
import { Text } from './Text';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  className,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <View
      className={cn('min-w-36 flex-1 gap-2 rounded-xl border border-border bg-card p-4', className)}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      {Icon ? (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-accent">
          <Icon size={20} color={toneColor[tone]} />
        </View>
      ) : null}
      <Text variant="title">{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const barTone: Record<Tone, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground',
};

export function ProgressBar({
  value,
  tone = 'primary',
  className,
  color,
}: {
  /** 0..1 */
  value: number;
  tone?: Tone;
  className?: string;
  /** Color hex opcional (p. ej. el color del grupo nutricional que manda la API) */
  color?: string | null;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      className={cn('h-3 w-full overflow-hidden rounded-full bg-muted', className)}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
    >
      <View
        className={cn('h-full rounded-full', !color && barTone[tone])}
        style={{ width: `${pct}%`, ...(color ? { backgroundColor: color } : null) }}
      />
    </View>
  );
}

export interface Step {
  key: string;
  label: string;
}

/** Stepper horizontal para máquinas de estado. `current` = índice del paso actual. */
export function Stepper({
  steps,
  current,
  failed,
}: {
  steps: Step[];
  current: number;
  /** Estado terminal fuera del flujo (cancelado, no se retiró) */
  failed?: string;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row items-start">
        {steps.map((s, i) => {
          const done = i < current || (i === current && i === steps.length - 1 && !failed);
          const active = i === current && !failed;
          return (
            <View key={s.key} className="flex-1 items-center gap-1.5">
              <View className="w-full flex-row items-center">
                <View className={cn('h-1 flex-1 rounded-full', i === 0 ? 'bg-transparent' : i <= current ? 'bg-primary' : 'bg-border')} />
                <View
                  className={cn(
                    'h-8 w-8 items-center justify-center rounded-full border-2',
                    done ? 'border-primary bg-primary' : active ? 'border-primary bg-accent' : 'border-border bg-card',
                  )}
                >
                  {done ? (
                    <Check size={16} color={colors.primaryForeground} />
                  ) : (
                    <Text className={cn('text-sm font-bold', active ? 'text-accent-foreground' : 'text-muted-foreground')}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                <View
                  className={cn('h-1 flex-1 rounded-full', i === steps.length - 1 ? 'bg-transparent' : i < current ? 'bg-primary' : 'bg-border')}
                />
              </View>
              <Text
                className={cn('px-1 text-center text-xs', active ? 'font-bold text-foreground' : 'text-muted-foreground')}
              >
                {s.label}
              </Text>
            </View>
          );
        })}
      </View>
      {failed ? (
        <View className="flex-row items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
          <X size={18} color={colors.destructive} />
          <Text className="font-semibold text-foreground">{failed}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-1 rounded-xl bg-muted p-1" accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            className={cn(
              'min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg px-2',
              selected ? 'bg-card shadow-sm' : 'active:bg-card/60',
            )}
          >
            <Text className={cn('text-base font-semibold', selected ? 'text-foreground' : 'text-muted-foreground')}>
              {o.label}
            </Text>
            {o.count ? (
              <View className="min-w-6 items-center rounded-full bg-primary px-1.5">
                <Text className="text-xs font-bold text-primary-foreground">{o.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Semáforo simple con ícono + texto (nunca solo color) */
export function TrafficLight({ level, label }: { level: 'ok' | 'medio' | 'bajo'; label: string }) {
  const tone: Tone = level === 'ok' ? 'success' : level === 'medio' ? 'warning' : 'destructive';
  const cls = level === 'ok' ? 'bg-success' : level === 'medio' ? 'bg-warning' : 'bg-destructive';
  return (
    <View className="flex-row items-center gap-2" accessible accessibilityLabel={label}>
      <View className={cn('h-3.5 w-3.5 rounded-full', cls)} />
      <Text className="text-sm" style={{ color: tone === 'warning' ? colors.foreground : undefined }}>
        {label}
      </Text>
    </View>
  );
}
