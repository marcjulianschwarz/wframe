// @ui-source: concepts/toast@0.2.0
// Managed copy. Edits here are local to this app.
// Improvements belong back in the ui repo's concepts/toast — port
// them there and bump the version. Do not treat this as throwaway code.
import { useEffect, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type ToastPosition =
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type ToastStatus = "success" | "error" | "warning" | "info";

export interface ToastData {
  /** stable key so React keeps the right node mounted while it animates */
  id: number;
  message: string;
  status: ToastStatus;
}

/** How long a toast lives before it auto-dismisses. */
export const TOAST_LIFETIME_MS = 3200;

const STATUS_ICON: Record<ToastStatus, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STATUS_COLOR: Record<ToastStatus, string> = {
  success: "text-ui-success",
  error: "text-ui-danger",
  warning: "text-ui-warning",
  info: "text-ui-info",
};

/**
 * Fixed container pinned to one of the six edges/corners. Toasts stack inside
 * it; bottom positions stack upward (column-reverse) so the newest sits closest
 * to the edge and older ones rise away from it.
 */
export function ToastViewport({
  position,
  children,
}: {
  position: ToastPosition;
  children: ReactNode;
}) {
  const isBottom = position.startsWith("bottom");

  const vertical = isBottom ? "bottom-0" : "top-0";
  const horizontal = position.endsWith("left")
    ? "left-0 items-start"
    : position.endsWith("right")
      ? "right-0 items-end"
      : "left-1/2 -translate-x-1/2 items-center";

  return (
    <div
      className={`pointer-events-none fixed z-50 flex flex-col gap-ui-s p-ui-m ${vertical} ${horizontal} ${
        isBottom ? "flex-col-reverse" : "flex-col"
      }`}
    >
      {children}
    </div>
  );
}

/** Where the toast slides from while hidden — toward its docked edge. */
function hiddenOffset(position: ToastPosition): string {
  if (position === "top") return "-translate-y-3";
  if (position === "bottom") return "translate-y-3";
  return position.endsWith("left") ? "-translate-x-3" : "translate-x-3";
}

export function Toast({
  toast,
  position,
  onDismiss,
}: {
  toast: ToastData;
  position: ToastPosition;
  onDismiss: () => void;
}) {
  // `shown` flips on the frame after mount to trigger the enter transition, and
  // back off to play the exit transition before we actually call onDismiss.
  const [shown, setShown] = useState(false);
  const Icon = STATUS_ICON[toast.status];

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const life = setTimeout(close, TOAST_LIFETIME_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(life);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    setShown(false);
    // Wait out the exit transition (matches duration-ui-base) before unmounting.
    setTimeout(onDismiss, 180);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={close}
      className={`pointer-events-auto flex w-72 max-w-[80vw] cursor-pointer items-center gap-ui-s rounded-ui-n border border-ui-border bg-ui-surface-raised px-ui-m py-ui-n text-ui-m text-ui-primary shadow-ui-high transition-all duration-ui-base ease-ui-out ${
        shown
          ? "translate-x-0 translate-y-0 scale-100 opacity-100"
          : `${hiddenOffset(position)} scale-95 opacity-0`
      }`}
    >
      <Icon
        className={`h-5 w-5 shrink-0 ${STATUS_COLOR[toast.status]}`}
        aria-hidden
      />
      <span className="leading-ui-snug">{toast.message}</span>
    </div>
  );
}
