import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';
import { Text } from './Text';

export function SwitchRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="min-h-14 flex-row items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <View className="flex-1">
        <Text variant="label" onPress={() => onChange(!value)}>
          {label}
        </Text>
        {description ? <Text variant="caption">{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.input }}
        thumbColor={colors.card}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Selector numérico grande (−/+) para cantidad de personas */
export function NumberStepper({
  label,
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  const btn = 'h-12 w-12 items-center justify-center rounded-full bg-accent active:opacity-80';
  return (
    <View className="gap-1.5">
      <Text variant="label">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Menos"
          onPress={() => set(value - step)}
          disabled={value <= min}
          className={cn(btn, value <= min && 'opacity-40')}
        >
          <Minus size={22} color={colors.accentForeground} />
        </Pressable>
        <TextInput
          value={String(value)}
          onChangeText={(t) => {
            const n = parseInt(t.replace(/\D/g, ''), 10);
            if (!Number.isNaN(n)) set(n);
          }}
          keyboardType="number-pad"
          accessibilityLabel={label}
          className="min-h-12 w-24 rounded-lg border border-input bg-card text-center text-2xl font-bold text-foreground"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Más"
          onPress={() => set(value + step)}
          disabled={value >= max}
          className={cn(btn, value >= max && 'opacity-40')}
        >
          <Plus size={22} color={colors.accentForeground} />
        </Pressable>
      </View>
    </View>
  );
}
