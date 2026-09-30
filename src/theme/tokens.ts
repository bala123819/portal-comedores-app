/**
 * Valores crudos del sistema de diseño para lo que no pasa por clases de NativeWind
 * (íconos, StatusBar, navegación, gráficos). Deben coincidir con `src/global.css`.
 */
export const colors = {
  primary: '#3B9B6E',
  primaryForeground: '#FFFFFF',
  accent: '#EBF4F0',
  accentForeground: '#2A6F4F',
  success: '#34B277',
  warning: '#F9A91F',
  info: '#2B8CEE',
  destructive: '#D74242',
  background: '#FDFDFC',
  foreground: '#1D212B',
  // Derivados
  muted: '#F4F3F0',
  mutedForeground: '#5C6370',
  card: '#FFFFFF',
  border: '#E3E1DC',
  input: '#D6D3CC',
  ring: '#3B9B6E',
} as const;

export type ColorToken = keyof typeof colors;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  full: 9999,
} as const;

export const spacing = {
  gutter: 16,
  touch: 48,
} as const;

export const layout = {
  /** Ancho máximo del contenido en web / tablet */
  maxContentWidth: 720,
} as const;

export type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'info' | 'destructive' | 'muted';

/** Color de ícono/acento según tono semántico */
export const toneColor: Record<Tone, string> = {
  primary: colors.primary,
  accent: colors.accentForeground,
  success: colors.success,
  warning: colors.foreground, // sobre `warning` va `foreground`, nunca blanco
  info: colors.info,
  destructive: colors.destructive,
  muted: colors.mutedForeground,
};
