/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        carbon: '#1C1C1E',
        'carbon-light': '#2C2C2E',
        'suit-denari': '#F59E0B',
        'suit-coppe': '#E11D48',
        'suit-spade': '#0EA5E9',
        'suit-bastoni': '#10B981',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'sans-serif',
        ],
      },
      borderRadius: {
        'squircle': '1.75rem',
        'squircle-sm': '1.25rem',
      },
      boxShadow: {
        'card': '0 20px 40px -15px rgba(0, 0, 0, 0.4)',
        'glow-white': '0 0 30px rgba(255, 255, 255, 0.15)',
        'glow-red': '0 0 35px rgba(225, 29, 72, 0.4)',
        'glow-gold': '0 0 35px rgba(245, 158, 11, 0.4)',
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'card-pop': 'pop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
