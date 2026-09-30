import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';
import { BottomSheet } from './BottomSheet';
import { Text } from './Text';

export interface SelectOption<T extends string> {
  label: string;
  value: T;
  description?: string;
}

export interface SelectProps<T extends string> {
  label?: string;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Elegí una opción',
  error,
  hint,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className="gap-1.5">
      {label ? <Text variant="label">{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Opción'}: ${selected?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        className={cn(
          'min-h-12 flex-row items-center justify-between rounded-lg border bg-card px-3 active:opacity-80',
          error ? 'border-destructive' : 'border-input',
        )}
      >
        <Text tone={selected ? 'default' : 'muted'} className="flex-1" numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={20} color={colors.mutedForeground} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="destructive">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label ?? placeholder}>
        {options.map((o) => {
          const isSelected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                'min-h-12 flex-row items-center gap-3 rounded-lg border px-3 py-2 active:opacity-80',
                isSelected ? 'border-primary bg-accent' : 'border-border bg-card',
              )}
            >
              <View className="flex-1">
                <Text variant="label">{o.label}</Text>
                {o.description ? <Text variant="caption">{o.description}</Text> : null}
              </View>
              {isSelected ? <Check size={20} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}
