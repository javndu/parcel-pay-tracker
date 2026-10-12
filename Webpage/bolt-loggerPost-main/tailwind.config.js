/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        auspost: {
          red: '#DC1928',
          'red-dark': '#B81423',
          'red-light': '#FDE8EA',
          'red-lighter': '#FEF4F5',
          charcoal: '#1A1A1A',
          gray: '#6B6B6B',
          'gray-light': '#F5F5F5',
          'gray-border': '#E0E0E0',
          success: '#00875A',
          'success-light': '#E6F4EF',
          warning: '#FF8B00',
          'warning-light': '#FFF5E6',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        'auspost': '8px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
