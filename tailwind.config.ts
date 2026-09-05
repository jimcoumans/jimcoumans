import type { Config } from 'tailwindcss'

/**
 * Huisstijl James Robinson - Brandbook 2024.
 * Kleuren en typografie hier centraal, nergens hardcoded in componenten.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        jr: {
          blue: '#007AFF',
          black: '#1C1C1E',
          deepblue: '#005CBF',
          lightblue: '#E2EBF3',
          lightgray: '#F2F2F7',
          red: '#FF3B30',
          orange: '#F6A027',
          yellow: '#FFD631',
          purple: '#AF52DE',
          green: '#34C759',
          btn: '#0857C3',
          btnhover: '#003967',
        },
        gray: {
          100: '#F2F2F7',
          200: '#E5E5E9',
          300: '#D2D1D7',
          400: '#C8C8CD',
          500: '#ADADB2',
          600: '#636466',
          700: '#49484A',
          800: '#3A3A3C',
          900: '#2C2D2E',
          950: '#1C1C1E',
        },
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontWeight: { light: '300', normal: '400', bold: '700' },
    },
  },
  plugins: [],
} satisfies Config
