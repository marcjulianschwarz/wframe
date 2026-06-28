/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-1": "var(--primary-background-color)",
        "bg-1-light": "var(--primary-background-color-light)",
        "bg-2": "var(--secondary-background-color)",
        "bg-hover": "var(--hover-state-background-color)",
        "bg-active": "var(--active-state-background-color)",
        "fg-1": "var(--font-color-1)",
        "fg-2": "var(--font-color-2)",
        "fg-danger": "var(--danger-font-color)",
        "border-1": "var(--border-color-1)",
        "border-2": "var(--border-color-2)",
        highlight: "var(--highlight-color)",
        "highlight-soft": "var(--highlight-color-soft)",
        "bg-danger": "var(--danger-background-color)",
        "bg-success": "var(--success-background-color)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      fontSize: {
        s: "var(--font-size-s)",
        m: "var(--font-size-m)",
        l: "var(--font-size-l)",
        xl: "var(--font-size-xl)",
      },
      spacing: {
        xs: "var(--space-xs)",
        s: "var(--space-s)",
        n: "var(--space-n)",
        m: "var(--space-m)",
        l: "var(--space-l)",
        xl: "var(--space-xl)",
      },
      borderRadius: {
        s: "var(--border-radius-s)",
        n: "var(--border-radius-n)",
      },
      boxShadow: {
        normal: "var(--shadow-normal)",
        high: "var(--shadow-high)",
        focus: "var(--focus-ring)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
    },
  },
  plugins: [],
};
