import { type InputHTMLAttributes } from "react";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-m py-n rounded-s border border-border-1 bg-bg-1-light text-fg-1 text-m hover:border-border-2 focus:border-highlight focus:shadow-focus outline-none transition-colors duration-fast ease-out ${className}`}
      {...rest}
    />
  );
}
