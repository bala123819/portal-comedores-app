import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cn } from '@/lib/cn';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'large';
type Tone =
  | 'default'
  | 'muted'
  | 'primary'
  | 'accent'
  | 'success'
  | 'destructive'
  | 'info'
  | 'inverse';

const variantClass: Record<Variant, string> = {
  display: 'text-3xl font-bold',
  title: 'text-2xl font-bold',
  heading: 'text-lg font-semibold',
  body: 'text-base',
  label: 'text-base font-semibold',
  caption: 'text-sm',
  large: 'text-2xl leading-9',
};

const toneClass: Record<Tone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  accent: 'text-accent-foreground',
  success: 'text-success',
  destructive: 'text-destructive',
  info: 'text-info',
  inverse: 'text-primary-foreground',
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  className?: string;
}

export function Text({ variant = 'body', tone, className, ...props }: TextProps) {
  const defaultTone: Tone = variant === 'caption' ? 'muted' : 'default';
  return (
    <RNText
      className={cn(variantClass[variant], toneClass[tone ?? defaultTone], className)}
      accessibilityRole={variant === 'title' || variant === 'display' ? 'header' : undefined}
      maxFontSizeMultiplier={1.6}
      {...props}
    />
  );
}
