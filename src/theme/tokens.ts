/**
 * Valores crudos del sistema de diseño para lo que no pasa por clases de NativeWind
 * (íconos, StatusBar, navegación, gráficos). Deben coincidir con `src/global.css`.
 */
export const colors = {
  primary: '#2E845C',
  primaryForeground: '#FFFFFF',
  accent: '#E7F3EE',
  accentForeground: '#216344',
  success: '#2E9E6A',
  warning: '#F9A91F',
  info: '#2B8CEE',
  destructive: '#D43535',
  background: '#F6F9F7',
  foreground: '#1D212B',
  // Derivados
  muted: '#EFF3F0',
  mutedForeground: '#555F6D',
  card: '#FFFFFF',
  border: '#E0E6E2',
  input: '#C7D1CA',
  ring: '#2E845C',
} as const;

export type ColorToken = keyof typeof colors;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

/**
 * Elevación suave (sombras con tinte verde oscuro, no negro puro).
 * `boxShadow` funciona en web, iOS y Android (RN ≥ 0.76, nueva arquitectura).
 */
export const shadows = {
  sm: { boxShadow: '0px 1px 2px rgba(18, 48, 34, 0.05), 0px 1px 3px rgba(18, 48, 34, 0.04)' },
  md: { boxShadow: '0px 4px 16px rgba(18, 48, 34, 0.06), 0px 1px 3px rgba(18, 48, 34, 0.05)' },
  lg: { boxShadow: '0px 12px 32px rgba(18, 48, 34, 0.10), 0px 2px 6px rgba(18, 48, 34, 0.06)' },
  primary: { boxShadow: '0px 6px 16px rgba(46, 132, 92, 0.28), 0px 1px 3px rgba(46, 132, 92, 0.20)' },
  bar: { boxShadow: '0px -4px 20px rgba(18, 48, 34, 0.06)' },
  focus: { boxShadow: '0px 0px 0px 3px rgba(46, 132, 92, 0.18)' },
} as const;

export const spacing = {
  gutter: 16,
  touch: 48,
} as const;

export const layout = {
  /** Ancho a partir del cual las listas pasan a 2 columnas */
  twoColumnsFrom: 1024,
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
