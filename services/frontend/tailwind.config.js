/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        hand: ["var(--font-hand)"],
      },
    },
  },
  plugins: [],
};
