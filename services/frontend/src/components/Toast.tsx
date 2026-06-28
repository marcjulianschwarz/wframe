import { useEffect } from "react";

interface Props {
  message: string;
  variant?: "success" | "error";
  onDismiss: () => void;
  /** Auto-dismiss after this many ms. */
  duration?: number;
}

/** A transient confirmation banner pinned to the bottom of the viewport. */
export function Toast({
  message,
  variant = "success",
  onDismiss,
  duration = 3000,
}: Props) {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [onDismiss, duration]);

  const tone =
    variant === "error"
      ? "bg-bg-danger text-fg-danger border-border-2"
      : "bg-bg-2 text-fg-1 border-border-2";

  return (
    <div
      role="status"
      className="fixed bottom-l left-1/2 -translate-x-1/2 z-50"
    >
      <div
        className={`flex items-center gap-s px-m py-n rounded-full border shadow-normal text-m ${tone}`}
      >
        {variant === "success" && <span aria-hidden>✓</span>}
        <span>{message}</span>
      </div>
    </div>
  );
}
