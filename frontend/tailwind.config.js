/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Light mode colors (default)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Custom surface colors that work with dark mode
        surface: {
          DEFAULT: '#f8fafc',
          dark: '#1f2937',
        },
        // Custom text colors
        'text-primary': {
          DEFAULT: '#111827',
          dark: '#f9fafb',
        },
        'text-secondary': {
          DEFAULT: '#6b7280',
          dark: '#9ca3af',
        },
        // Custom border colors
        border: {
          DEFAULT: '#e5e7eb',
          dark: '#374151',
        },
      },
    },
  },
  plugins: [],
}
