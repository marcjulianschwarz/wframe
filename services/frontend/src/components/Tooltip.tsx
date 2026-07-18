import type { ReactNode } from "react";

/** A hand-styled tooltip in the app's sketch theme. Wraps its trigger and shows
 * `label` in a small bubble above it on hover/focus. Purely CSS-driven (see the
 * `.tooltip-*` rules in styles.css).
 *
 * Pass `open` to force the bubble visible regardless of hover — used for
 * self-showing heads-up popovers (e.g. an imminent refresh). */
export function Tooltip({
  label,
  open = false,
  children,
}: {
  label: ReactNode;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="tooltip-wrap">
      {children}
      <span className={`tooltip-bubble${open ? " tooltip-open" : ""}`} role="tooltip">
        {label}
      </span>
    </span>
  );
}
