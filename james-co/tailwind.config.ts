import type { Config } from 'tailwindcss'

/** Designtokens James & Co.: rustige, warme luxe. Bronze alleen decoratief, nooit kleine hoofdtekst. */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F3ED',
        surface: '#FFFFFF',
        ink: '#242823',
        forest: { DEFAULT: '#233B33', dark: '#18291F', soft: '#E4EAE5' },
        bronze: '#92754E',
        muted: '#5C625A', // #636960 haalt 4.5:1 net op canvas; iets donkerder voor kleine tekst
        line: '#DDDCD4',
        warn: { DEFAULT: '#8A4B12', soft: '#F7EBDD' },
        danger: { DEFAULT: '#9B2C2C', soft: '#F8E5E3' },
        ok: { DEFAULT: '#2D5A3D', soft: '#E3EEE6' },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      maxWidth: { prose: '38rem' },
    },
  },
  plugins: [],
} satisfies Config
