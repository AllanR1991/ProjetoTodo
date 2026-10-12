/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ms: {
          blue: '#2564cf',
          'blue-hover': '#1b4fa0',
          'blue-light': '#ebf3fc',
          bg: '#f3f4f6',
          sidebar: '#ffffff',
          surface: '#ffffff',
          text: '#242424',
          subtext: '#616161',
        },
      },
    },
  },
  plugins: [],
};
