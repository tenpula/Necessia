import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#1111d4",
        "background-light": "#f6f6f8",
        "background-dark": "#000000",
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Open Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      animation: {
          'pulse-slow': 'pulse-slow 8s infinite ease-in-out',
      },
      keyframes: {
          'pulse-slow': {
              '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
              '50%': { opacity: '0.5', transform: 'scale(1.1)' },
          }
      }
    },
  },
  plugins: [],
}
export default config
