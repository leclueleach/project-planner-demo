/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red:    '#ed1c24',
          yellow: '#fcaf17',
          dark:   '#2c2c2b',
          green:  '#008745',
          blue:   '#0066b3',
          pink:   '#f287b7',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
}