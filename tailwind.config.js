/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Zoho Puvi', 'PingFang SC', 'Microsoft YaHei', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        'brand-orange': '#ff6633',
        'brand-dark': '#1a1a1a',
        'semantic-success': '#22c55e',
        'semantic-error': '#ef4444',
        'semantic-warning': '#f59e0b',
        'bg-page': '#f5f6f8',
      },
      spacing: {
        'micro': '4px',
        'base': '8px',   // 8px grid system base
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
      },
      borderRadius: {
        'micro': '4px',
        'std': '8px',
      },
      boxShadow: {
        's': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'm': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'l': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }
    },
  },
  plugins: [],
}
