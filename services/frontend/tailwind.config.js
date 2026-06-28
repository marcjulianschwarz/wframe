// The token → utility mapping is the shared *contract*, managed by the UI
// registry. Import it so this app and templates/ui stay in lockstep; brand
// *values* live in src/styles/tokens.css (app-owned). See CLAUDE.md.
import tokens from "./src/ui/concepts/tokens/tailwind-tokens.cjs";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Token contract (colors, type, spacing, radius, shadow, motion easings).
      ...tokens,
      keyframes: {
        // Enter animations the managed Modal component can use (slide/fade/pop).
        "modal-slide": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "modal-fade": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        // Springy scale "pop" — the panel overshoots full size then settles.
        "modal-pop": {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "backdrop-fade": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "modal-slide": "modal-slide var(--duration-base) var(--ease-out)",
        "modal-fade": "modal-fade var(--duration-base) var(--ease-out)",
        // Spring overshoot easing gives the "pop" its bounce.
        "modal-pop": "modal-pop 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        "backdrop-fade": "backdrop-fade 120ms ease",
      },
    },
  },
  plugins: [],
};
