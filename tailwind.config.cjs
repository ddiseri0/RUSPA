/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          dark: '#000000',
          panel: '#262626',
          muted: '#d9d9d9',
          light: '#e6e6e6',
          bright: '#f2f2f2',
        },
        'app-black': '#000000',
        'app-panel': '#262626',
        'app-muted': '#d9d9d9',
        'app-light': '#e6e6e6',
        'app-bright': '#f2f2f2',
        carbon: '#262626',
        'carbon-light': '#333333',
        highlight: '#e3e700',
        accent: '#e3e700',
        // Card suits (preserved as requested)
        'suit-denari': '#D97706',
        'suit-coppe': '#DC2626',
        'suit-spade': '#2563EB',
        'suit-bastoni': '#78350F',
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
