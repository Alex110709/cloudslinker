/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cloudslinker-blue': '#1890FF',
        'success-green': '#52C41A',
        'warning-orange': '#FAAD14',
        'error-red': '#FF4D4F',
        'neutral-gray': '#F0F2F5',
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disable Tailwind's reset to work better with Ant Design
  },
}