/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#F5F7FA',
          100: '#EAF0F7',
          200: '#DCE3EC',
          300: '#94A3B8',
          400: '#64748B',
          500: '#315B8A',  // Accent Blue
          600: '#254870',
          700: '#1E3A5F',  // Secondary Navy Blue
          800: '#19304F',
          900: '#142B4A',  // Primary Navy Blue
          950: '#0D1C30',
        },
        brand: {
          50: '#F5F7FA',
          100: '#EAF0F7',
          200: '#DCE3EC',
          300: '#94A3B8',
          400: '#315B8A',
          500: '#1E3A5F',
          600: '#142B4A',
          700: '#142B4A',
          800: '#0D1C30',
          900: '#0D1C30',
          950: '#081220',
        },
        accent: {
          50: '#F5F7FA',
          100: '#EAF0F7',
          200: '#DCE3EC',
          300: '#64748B',
          400: '#315B8A',
          500: '#315B8A',
          600: '#254870',
          700: '#1E3A5F',
          800: '#142B4A',
          900: '#0D1C30',
        },
        success: '#15803D',
        warning: '#D97706',
        danger: '#DC2626',
        surface: {
          50: '#FFFFFF',
          100: '#3a67aaff',
          200: '#EAF0F7',
          300: '#DCE3EC',
          400: '#94A3B8',
          500: '#64748B',
          600: '#315B8A',
          700: '#1E3A5F',
          800: '#142B4A',
          900: '#0D1C30',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(20, 43, 74, 0.05), 0 1px 2px -1px rgba(20, 43, 74, 0.05)',
        'card-hover': '0 4px 12px 0 rgba(20, 43, 74, 0.08), 0 2px 4px -2px rgba(20, 43, 74, 0.06)',
        'dropdown': '0 10px 25px -5px rgba(20, 43, 74, 0.1), 0 8px 10px -6px rgba(20, 43, 74, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
