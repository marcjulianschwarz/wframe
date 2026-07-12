import { type InputHTMLAttributes } from "react";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-ui-m py-ui-n rounded-ui-s border border-ui-border bg-ui-surface-raised text-ui-primary text-ui-m hover:border-ui-border-strong focus:border-ui-accent focus:shadow-ui-focus outline-none transition-colors duration-ui-fast ease-ui-out ${className}`}
      {...rest}
    />
  );
}
