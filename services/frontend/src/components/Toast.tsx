import { useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type ToastStatus = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: number;
  message: string;
  status: ToastStatus;
}

const TOAST_LIFETIME_MS = 3200;

const ICON: Record<ToastStatus, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLOR: Record<ToastStatus, string> = {
  success: "var(--mint)",
  error: "var(--danger)",
  warning: "#e8a13a",
  info: "var(--ink-soft)",
};

function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, TOAST_LIFETIME_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);
  const Icon = ICON[toast.status];
  return (
    <div
      className="sketch flex items-center gap-2 px-4 py-3 text-sm font-bold"
      style={{ animation: "pop 180ms ease" }}
    >
      <Icon size={18} style={{ color: COLOR[toast.status] }} />
      <span>{toast.message}</span>
    </div>
  );
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}
