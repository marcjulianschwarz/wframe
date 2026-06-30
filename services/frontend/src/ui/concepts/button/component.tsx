// @ui-source: concepts/button@0.1.0
// Managed copy. Edits here are local to this app.
// Improvements belong back in the ui repo's concepts/button — port
// them there and bump the version. Do not treat this as throwaway code.
import { type ButtonHTMLAttributes } from "react";

type Variant = "default" | "primary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  default:
    "bg-ui-surface-raised border border-ui-border text-ui-primary hover:bg-ui-surface-hover hover:border-ui-border-strong active:bg-ui-surface-active",
  primary:
    "bg-ui-accent border border-ui-accent text-ui-on-accent hover:bg-ui-accent-strong active:brightness-95",
  ghost:
    "bg-transparent border border-transparent text-ui-secondary hover:bg-ui-surface-hover hover:text-ui-primary",
  danger:
    "bg-ui-surface-raised border border-ui-border text-ui-danger hover:bg-ui-danger-bg hover:border-ui-danger-border",
};

export function Button({
  variant = "default",
  className = "",
  ...rest
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-s px-m py-s rounded-md font-semibold text-m leading-none transition-all duration-fast ease-out active:translate-y-px disabled:opacity-50 disabled:pointer-events-none ${variantClass[variant]} ${className}`}
      {...rest}
    />
  );
}
