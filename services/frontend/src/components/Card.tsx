import { type HTMLAttributes } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-bg-1-light border border-border-1 rounded-n p-m ${className}`}
      {...rest}
    />
  );
}
