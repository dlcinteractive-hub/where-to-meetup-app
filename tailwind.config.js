/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF0F0',
          100: '#FFE0E0',
          200: '#FFB3B3',
          300: '#FF8E8E',
          400: '#FF6B6B',
          500: '#FF6B6B',
          600: '#CC4444',
          700: '#993333',
        },
        accent: {
          300: '#FFC97A',
          400: '#FFB347',
          500: '#FF9500',
        },
        brand: {
          dark: '#1A1A2E',
          medium: '#4A4A68',
          muted: '#6B6B7B',
          light: '#F5F5FA',
          border: '#E0E0E8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
