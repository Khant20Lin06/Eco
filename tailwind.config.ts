import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        soil: '#2b2118',
        moss: '#3b5d3a',
        leaf: '#6aa84f',
        sand: '#f2e8cf',
        stone: '#c7bda6'
      }
    }
  },
  plugins: []
} satisfies Config;
