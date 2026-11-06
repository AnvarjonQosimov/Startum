/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        stratum: {
          950: '#070A10',
          900: '#0C111C',
          850: '#111726',
          800: '#161F33',
          750: '#1C2740',
          700: '#23304E',
          600: '#33446B',
          500: '#4D6499',
          400: '#7B93C7',
          300: '#AEC0E6',
          200: '#D5E0F7',
          100: '#EDF2FC',
          50: '#F7FAFF'
        },
        cyanGlow: {
          DEFAULT: '#00E5C0',
          hover: '#05F7D0',
          dim: 'rgba(0, 229, 192, 0.15)'
        },
        indigoGlow: {
          DEFAULT: '#6366F1',
          hover: '#818CF8',
          dim: 'rgba(99, 102, 241, 0.15)'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}

