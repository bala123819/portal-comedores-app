import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { useState, type Ref } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  containerClassName?: string;
  className?: string;
  ref?: Ref<TextInput>;
}

export function Input({
  label,
  hint,
  error,
  icon: Icon,
  containerClassName,
  className,
  secureTextEntry,
  multiline,
  onFocus,
  onBlur,
  ref,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? <Text variant="label">{label}</Text> : null}
      <View
        className={cn(
          'flex-row items-center rounded-lg border bg-card px-3',
          multiline ? 'min-h-28 items-start py-2' : 'min-h-12',
          error ? 'border-destructive' : focused ? 'border-primary' : 'border-input',
        )}
      >
        {Icon ? (
          <View className={cn('mr-2', multiline && 'mt-1')}>
            <Icon size={20} color={colors.mutedForeground} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          className={cn('flex-1 py-2 text-base text-foreground', className)}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={secureTextEntry && hidden}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            onPress={() => setHidden((h) => !h)}
            className="h-12 w-12 items-center justify-center rounded-full"
          >
            {hidden ? (
              <Eye size={20} color={colors.mutedForeground} />
            ) : (
              <EyeOff size={20} color={colors.mutedForeground} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
}

export function TextArea(props: InputProps) {
  return <Input multiline numberOfLines={4} {...props} />;
}
