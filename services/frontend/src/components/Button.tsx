import { type ButtonHTMLAttributes } from "react";

type Variant = "default" | "primary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  default:
    "bg-bg-1-light border border-border-1 text-fg-1 hover:bg-bg-hover hover:border-border-2 active:bg-bg-active",
  primary:
    "bg-highlight border border-highlight text-white hover:brightness-110 active:brightness-95",
  ghost:
    "bg-transparent border border-transparent text-fg-2 hover:bg-bg-hover hover:text-fg-1",
  danger:
    "bg-bg-1-light border border-border-1 text-fg-danger hover:bg-bg-danger hover:border-border-2 active:bg-bg-danger",
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
