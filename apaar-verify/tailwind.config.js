/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1B2A5C',
        brand: '#0070C0',
        accent: '#F37021',
        ok: '#2E8B3E',
        danger: '#C62828',
        paper: v('paper'),
        ink: v('ink'),
        card: v('card'),
        line: v('line'),
        muted: v('muted'),
        soft: v('soft'),
        heading: v('heading'),
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      keyframes: {
        shimmer: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.45' } },
      },
      animation: { shimmer: 'shimmer 1.4s ease-in-out infinite' },
    },
  },
  plugins: [],
};
