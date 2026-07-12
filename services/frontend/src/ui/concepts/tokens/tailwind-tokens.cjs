// @ui-source: concepts/tokens@0.4.0
// Managed copy. Edits here are local to this app.
// Improvements belong back in the ui repo's concepts/tokens — port
// them there and bump the version. Do not treat this as throwaway code.
// The token → Tailwind-utility mapping. This is the *contract* half of the
// tokens concept: it must match the `--…` variables declared in tokens.css.
// Spread it into your app's tailwind.config.js `theme.extend`:
//
//   const tokens = require("./src/ui/concepts/tokens/tailwind-tokens.cjs");
//   export default { theme: { extend: { ...tokens } } };
//
// Color utilities are namespaced with a `ui-` prefix (bg-ui-accent,
// text-ui-danger, border-ui-strong) so they never collide with Tailwind's
// built-in scales or a consuming app's config. Only *semantic* (Tier 2)
// tokens are exposed — the raw primitive scales (--red-500, --gray-100, …)
// are intentionally not utilities, so components consume roles, not the
// palette. Keep the names identical to ui; change only *values* in tokens.css.
module.exports = {
  colors: {
    // Surfaces — bg-ui-surface-*
    "ui-surface-base": "var(--surface-base)",
    "ui-surface-raised": "var(--surface-raised)",
    "ui-surface-sunken": "var(--surface-sunken)",
    "ui-surface-hover": "var(--surface-hover)",
    "ui-surface-active": "var(--surface-active)",
    "ui-surface-disabled": "var(--surface-disabled)",

    // Text — text-ui-*
    "ui-primary": "var(--color-text-primary)",
    "ui-secondary": "var(--color-text-secondary)",
    "ui-muted": "var(--color-text-muted)",
    "ui-inverse": "var(--color-text-inverse)",
    "ui-link": "var(--color-text-link)",
    "ui-on-accent": "var(--color-text-on-accent)",

    // Accent — bg-ui-accent / text-ui-accent / border-ui-accent
    "ui-accent": "var(--color-accent)",
    "ui-accent-strong": "var(--color-accent-strong)",
    "ui-accent-soft": "var(--color-accent-soft)",

    // Status — foreground / soft bg / border / solid fill / on-fill text
    "ui-danger": "var(--color-danger)",
    "ui-danger-bg": "var(--color-danger-bg)",
    "ui-danger-border": "var(--color-danger-border)",
    "ui-danger-solid": "var(--color-danger-solid)",
    "ui-danger-on": "var(--color-danger-on)",

    "ui-success": "var(--color-success)",
    "ui-success-bg": "var(--color-success-bg)",
    "ui-success-border": "var(--color-success-border)",
    "ui-success-solid": "var(--color-success-solid)",
    "ui-success-on": "var(--color-success-on)",

    "ui-warning": "var(--color-warning)",
    "ui-warning-bg": "var(--color-warning-bg)",
    "ui-warning-border": "var(--color-warning-border)",
    "ui-warning-solid": "var(--color-warning-solid)",
    "ui-warning-on": "var(--color-warning-on)",

    "ui-info": "var(--color-info)",
    "ui-info-bg": "var(--color-info-bg)",
    "ui-info-border": "var(--color-info-border)",
    "ui-info-solid": "var(--color-info-solid)",
    "ui-info-on": "var(--color-info-on)",

    // Overlay — bg-ui-overlay (scrim behind modals/drawers)
    "ui-overlay": "var(--color-overlay)",

    // Borders — border-ui-*
    "ui-border-subtle": "var(--color-border-subtle)",
    "ui-border": "var(--color-border)",
    "ui-border-strong": "var(--color-border-strong)",
    "ui-border-focus": "var(--color-border-focus)",
  },
  fontFamily: {
    "ui-sans": "var(--font-sans)",
    "ui-mono": "var(--font-mono)",
  },
  fontSize: {
    "ui-s": "var(--font-size-s)",
    "ui-m": "var(--font-size-m)",
    "ui-l": "var(--font-size-l)",
    "ui-xl": "var(--font-size-xl)",
  },
  fontWeight: {
    "ui-normal": "var(--font-weight-normal)",
    "ui-medium": "var(--font-weight-medium)",
    "ui-semibold": "var(--font-weight-semibold)",
    "ui-bold": "var(--font-weight-bold)",
  },
  lineHeight: {
    "ui-tight": "var(--leading-tight)",
    "ui-snug": "var(--leading-snug)",
    "ui-normal": "var(--leading-normal)",
  },
  letterSpacing: {
    "ui-tight": "var(--tracking-tight)",
    "ui-normal": "var(--tracking-normal)",
    "ui-wide": "var(--tracking-wide)",
  },
  spacing: {
    "ui-xs": "var(--space-xs)",
    "ui-s": "var(--space-s)",
    "ui-n": "var(--space-n)",
    "ui-m": "var(--space-m)",
    "ui-l": "var(--space-l)",
    "ui-xl": "var(--space-xl)",
  },
  borderRadius: {
    "ui-s": "var(--border-radius-s)",
    "ui-n": "var(--border-radius-n)",
  },
  // Themeable border widths. `border-ui` is the default control/card outline;
  // `border-ui-thick` for emphasis. Use these instead of Tailwind's fixed
  // `border` so a theme can go hairline, heavy, or borderless.
  borderWidth: {
    ui: "var(--border-width)",
    "ui-thick": "var(--border-width-thick)",
  },
  boxShadow: {
    "ui-normal": "var(--shadow-normal)",
    "ui-high": "var(--shadow-high)",
    "ui-focus": "var(--focus-ring)",
  },
  transitionDuration: {
    "ui-fast": "var(--duration-fast)",
    "ui-base": "var(--duration-base)",
    "ui-spin": "var(--duration-spin)",
    "ui-spin-fast": "var(--duration-spin-fast)",
    "ui-spin-faster": "var(--duration-spin-faster)",
  },
  transitionTimingFunction: {
    "ui-out": "var(--ease-out)",
  },
};
