import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6200ee",
          dark: "#3700b3",
        },
        secondary: {
          DEFAULT: "#03dac6",
          dark: "#018786",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
