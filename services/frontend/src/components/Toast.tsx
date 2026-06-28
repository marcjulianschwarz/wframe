import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, type LucideIcon } from "lucide-react";

type Variant = "success" | "error";

interface Props {
  message: string;
  variant?: Variant;
  onDismiss: () => void;
  /** Auto-dismiss after this many ms. */
  duration?: number;
}

const STATUS_ICON: Record<Variant, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
};

const STATUS_COLOR: Record<Variant, string> = {
  success: "text-bg-success",
  error: "text-fg-danger",
};

/**
 * A transient confirmation toast pinned to the bottom of the viewport. Slides in
 * on mount and back out before unmounting; click or the timer dismisses it.
 */
export function Toast({
  message,
  variant = "success",
  onDismiss,
  duration = 3000,
}: Props) {
  // `shown` flips on the frame after mount to trigger the enter transition, and
  // back off to play the exit transition before we actually call onDismiss.
  const [shown, setShown] = useState(false);
  const Icon = STATUS_ICON[variant];

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const life = setTimeout(close, duration);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(life);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    setShown(false);
    // Wait out the exit transition (matches duration-base) before unmounting.
    setTimeout(onDismiss, 180);
  }

  return (
    <div className="pointer-events-none fixed right-0 top-0 z-50 flex p-m">
      <div
        role="status"
        aria-live="polite"
        onClick={close}
        className={`pointer-events-auto flex max-w-[80vw] cursor-pointer items-center gap-s rounded-n border border-border-1 bg-bg-1-light px-m py-n text-m text-fg-1 shadow-high transition-all duration-base ease-out ${
          shown
            ? "translate-x-0 scale-100 opacity-100"
            : "translate-x-3 scale-95 opacity-0"
        }`}
      >
        <Icon
          className={`h-5 w-5 shrink-0 ${STATUS_COLOR[variant]}`}
          aria-hidden
        />
        <span className="leading-snug">{message}</span>
      </div>
    </div>
  );
}
