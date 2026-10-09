import type { Config } from 'tailwindcss'

/**
 * Huisstijl James Robinson: het designsysteem uit styleguide/jr-elementor-globals.css,
 * vertaald naar Tailwind. Kleuren, grijzen, hoeken, schaduwen en letters staan
 * hier centraal; een component kiest een stap uit deze trappen en mengt nooit
 * zelf een waarde.
 *
 * De namen die het portaal al gebruikte (rounded-xl, shadow-sm, gray-600) zijn
 * bewust gebleven en wijzen nu naar de waarden uit het designsysteem. Zo gaat
 * elk scherm in één keer mee.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        jr: {
          blue: '#007AFF', // vorm: icoon, vlak, streep
          link: '#0066CC', // blauw als tekst
          black: '#1C1C1E', // merkzwart: de navigatie
          text: '#1D1D1F', // tekst primair
          deepblue: '#005CBF',
          lightblue: '#E2EBF3',
          lightgray: '#F5F5F7', // Apple's sectiegrijs: de pagina
          red: '#FF3B30',
          orange: '#F6A027',
          yellow: '#FFD631',
          purple: '#AF52DE',
          green: '#34C759',
          lime: '#C4F000',
          btn: '#0857C3', // knopvlak
          btnhover: '#003967',
        },
        // De grijstrap van het designsysteem.
        gray: {
          50: '#FAFAFB',
          100: '#F5F5F7',
          150: '#EBEBF0', // verzonken vlak
          200: '#E5E5E9', // subtiele lijn
          300: '#D2D2D7', // standaard lijn
          400: '#C8C8CD', // lijn bij hover
          500: '#86868B', // tekst tertiair
          600: '#6E6E73', // tekst secundair
          700: '#49484A',
          800: '#3A3A3C',
          900: '#2C2D2E',
          950: '#1D1D1F',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['var(--font-figtree)', 'Figtree', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontWeight: { light: '300', normal: '400', medium: '500', semibold: '600', bold: '700' },
      borderRadius: {
        md: '10px',
        lg: '12px', // velden, knoppen in een rij, kleine vlakken
        xl: '18px', // kaarten
        '2xl': '24px',
      },
      boxShadow: {
        // Twee lagen per schaduw: kort voor de rand, lang voor de diepte.
        sm: '0 1px 3px rgba(0,0,0,.05), 0 2px 8px rgba(0,0,0,.04)',
        md: '0 2px 6px rgba(0,0,0,.05), 0 8px 20px rgba(0,0,0,.06)',
        lg: '0 4px 12px rgba(0,0,0,.06), 0 16px 40px rgba(0,0,0,.08)',
      },
      ringColor: { DEFAULT: 'rgba(0,122,255,.40)' },
    },
  },
  plugins: [],
} satisfies Config
