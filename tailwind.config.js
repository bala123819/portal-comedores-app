/** @type {import('tailwindcss').Config} */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // La app es solo modo claro (userInterfaceStyle: light). 'class' evita el error de NativeWind en web.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: token('background'),
        foreground: token('foreground'),
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
        success: { DEFAULT: token('success'), foreground: token('success-foreground') },
        warning: { DEFAULT: token('warning'), foreground: token('warning-foreground') },
        info: { DEFAULT: token('info'), foreground: token('info-foreground') },
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '10px',
        DEFAULT: '10px',
        xl: '14px',
        full: '9999px',
      },
      fontSize: {
        xs: ['13px', '18px'],
        sm: ['14px', '20px'],
        base: ['16px', '24px'],
        lg: ['18px', '26px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '38px'],
      },
      maxWidth: { content: '720px' },
    },
  },
  plugins: [],
};
