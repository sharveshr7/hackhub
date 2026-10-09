/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#F0F3F9',
          100: '#E1E7F2',
          200: '#C3D0E6',
          300: '#94ACD1',
          400: '#6384B7',
          500: '#3F619B',
          600: '#2A467E',
          700: '#1F3463',
          800: '#142244',
          900: '#0B132B',
          950: '#060B1A',
        },
        brand: {
          primary: '#0B132B',
          secondary: '#2563EB',
          accent: '#06B6D4',
          cyan: '#00F0FF',
          dark: '#070C1E',
          surface: '#F8FAFC',
          card: '#FFFFFF',
        }
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'elevated': '0 4px 20px -2px rgba(11, 19, 43, 0.08), 0 2px 6px -1px rgba(11, 19, 43, 0.04)',
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.35)',
        'glow-blue': '0 0 25px -5px rgba(37, 99, 235, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
