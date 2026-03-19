/**
 * Brand constants for server-side rendering (icon generation, OG images, etc.).
 * These values MUST stay in sync with the @theme block in styles/theme.css.
 * For Tailwind CSS usage in components, use the theme classes (bg-brand-blue, etc.).
 */
export const BRAND = {
  name: 'La tribune des fans',
  shortName: 'LT',
  tagline: 'Vos tribunes, vos opinions',
  domain: 'fanstribune.com',
  colors: {
    blue: '#0B4870',
    blueDark: '#083A5A',
    blueLight: '#1969B4',
    orange: '#E67E22',
    orangeLight: '#F39C12',
    white: '#FFFFFF',
    background: '#F9FAFB',
  },
} as const;
