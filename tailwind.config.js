/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'cyber-dark': '#0a0a0a',
        'cyber-blue': '#00ffff',
        'cyber-green': '#00ff00',
        'cyber-red': '#ff0040',
      }
    },
  },
  plugins: [],
}
