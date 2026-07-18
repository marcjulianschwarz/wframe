import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

/** Playful hand-rolled modal: sketchy paper panel over a dim backdrop. Closes on
 * Escape and on backdrop click. */
export function Modal({
  title,
  children,
  actions,
  onClose,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div
        className="sketch modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-xl m-0">{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {children}
        {actions && (
          <div className="flex items-center gap-2 justify-end mt-6">{actions}</div>
        )}
      </div>
    </div>
  );
}
