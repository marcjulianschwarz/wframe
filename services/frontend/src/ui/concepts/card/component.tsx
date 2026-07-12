// @ui-source: concepts/card@0.1.1
// Managed copy. Edits here are local to this app.
// Improvements belong back in the ui repo's concepts/card — port
// them there and bump the version. Do not treat this as throwaway code.
import { type HTMLAttributes } from "react";

type Variant = "raised" | "outlined" | "sunken" | "ghost";
type Padding = "none" | "s" | "m" | "l";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  padding?: Padding;
  /** Adds hover lift + pointer affordance; use when the whole card is clickable. */
  interactive?: boolean;
}

const variantClass: Record<Variant, string> = {
  raised: "bg-ui-surface-raised border-ui border-ui-border-subtle shadow-ui-normal",
  outlined: "bg-ui-surface-raised border-ui border-ui-border",
  sunken: "bg-ui-surface-sunken border-ui border-transparent",
  ghost: "bg-transparent border-ui border-transparent",
};

const paddingClass: Record<Padding, string> = {
  none: "p-0",
  s: "p-ui-s",
  m: "p-ui-m",
  l: "p-ui-l",
};

export function Card({
  variant = "raised",
  padding = "m",
  interactive = false,
  className = "",
  ...rest
}: CardProps) {
  const interactiveClass = interactive
    ? "cursor-pointer transition-all duration-ui-fast ease-ui-out hover:border-ui-border hover:shadow-ui-high active:shadow-ui-normal"
    : "";
  return (
    <div
      className={`rounded-ui-n text-ui-primary ${variantClass[variant]} ${paddingClass[padding]} ${interactiveClass} ${className}`}
      {...rest}
    />
  );
}

/** Header slot — title + optional supporting text / trailing action. */
export function CardHeader({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-start justify-between gap-ui-n ${className}`}
      {...rest}
    />
  );
}

export function CardTitle({ className = "", ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-ui-l font-ui-semibold leading-ui-snug tracking-ui-tight ${className}`}
      {...rest}
    />
  );
}

export function CardDescription({
  className = "",
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-ui-m text-ui-secondary leading-ui-normal ${className}`}
      {...rest}
    />
  );
}

/** Body content. Gains top spacing when it follows a header. */
export function CardContent({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-ui-n ${className}`} {...rest} />;
}

/** Footer — actions row, divided from the body by a subtle rule. */
export function CardFooter({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`mt-ui-m pt-ui-n border-t border-ui-border-subtle flex items-center gap-ui-s ${className}`}
      {...rest}
    />
  );
}
