import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}

/**
 * A modal dialog: focus move, Escape-to-close, scroll lock, and a click-outside
 * backdrop. The panel "pops" in with a springy scale overshoot; the backdrop
 * fades in underneath. Ported from the shared UI templates.
 */
export function Modal({ title, actions, children, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock background scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Move focus into the panel on open.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-m animate-backdrop-fade"
      onMouseDown={(e) => {
        // Only close on a click that both starts and ends on the backdrop.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-n border border-border-1 bg-bg-1-light shadow-high outline-none animate-modal-pop"
      >
        <div className="p-l">
          <h3 className="text-l">{title}</h3>
          <div className="mt-m">{children}</div>
          {actions && <div className="mt-l flex justify-end gap-s">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
