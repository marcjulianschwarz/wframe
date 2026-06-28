import { type ButtonHTMLAttributes } from "react";

type Variant = "default" | "primary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  default:
    "bg-bg-1-light border border-border-1 text-fg-1 shadow-normal hover:bg-bg-hover hover:border-border-2 hover:shadow-high active:bg-bg-active active:shadow-normal",
  primary:
    "bg-highlight border border-highlight text-white shadow-normal hover:brightness-110 hover:shadow-high active:brightness-95 active:shadow-normal",
  ghost:
    "bg-transparent border border-transparent text-fg-2 hover:bg-bg-hover hover:text-fg-1",
  danger:
    "bg-bg-1-light border border-border-1 text-fg-danger shadow-normal hover:bg-bg-danger hover:border-border-2 active:bg-bg-danger",
};

export function Button({ variant = "default", className = "", ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-s px-m py-n rounded-full font-semibold text-m leading-none transition-all duration-fast ease-out active:translate-y-px disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none ${variantClass[variant]} ${className}`}
      {...rest}
    />
  );
}
