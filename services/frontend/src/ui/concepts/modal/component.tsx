// @ui-source: concepts/modal@0.5.2
// Managed copy. Edits here are local to this app.
// Improvements belong back in the ui repo's concepts/modal — port
// them there and bump the version. Do not treat this as throwaway code.
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export type ModalLayout = "plain" | "bar";
export type ModalEnter = "slide" | "fade" | "pop";
export type ModalWidth = "sm" | "md" | "lg" | "xl";

const ENTER_CLASS: Record<ModalEnter, string> = {
  slide: "animate-modal-slide",
  fade: "animate-modal-fade",
  pop: "animate-modal-pop",
};

// Full class names (not concatenated) so Tailwind keeps them through purge.
const WIDTH_CLASS: Record<ModalWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export interface ModalProps {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  /** "plain" inlines the title/actions; "bar" gives them divided bars. */
  layout?: ModalLayout;
  /** Enter animation. */
  enter?: ModalEnter;
  /** Max width of the panel. Grows from "sm" (default) to "xl". */
  width?: ModalWidth;
}

/**
 * A modal dialog: focus move, Escape-to-close, scroll lock, and a click-outside
 * backdrop. Self-contained — no theme-system dependency; pass `layout`/`enter`
 * to vary it (a themed app can feed these from a recipe at the call site).
 */
export function Modal({
  title,
  actions,
  children,
  onClose,
  layout = "plain",
  enter = "slide",
  width = "sm",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const enterClass = ENTER_CLASS[enter] ?? ENTER_CLASS.slide;
  const widthClass = WIDTH_CLASS[width] ?? WIDTH_CLASS.sm;
  const bar = layout === "bar";

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

  // Block scroll gestures that don't originate inside the modal's scroll area —
  // i.e. over the dim backdrop margin. `overscroll-contain` handles chaining
  // from within the content; this stops the background scrolling everywhere
  // else. Listeners are non-passive so preventDefault() actually takes effect.
  useEffect(() => {
    const backdrop = backdropRef.current;
    if (!backdrop) return;
    const block = (e: Event) => {
      const scroller = scrollRef.current;
      if (!scroller || !scroller.contains(e.target as Node)) e.preventDefault();
    };
    backdrop.addEventListener("wheel", block, { passive: false });
    backdrop.addEventListener("touchmove", block, { passive: false });
    return () => {
      backdrop.removeEventListener("wheel", block);
      backdrop.removeEventListener("touchmove", block);
    };
  }, []);

  // Move focus into the panel on open.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div
      ref={backdropRef}
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
        className={`relative flex max-h-[90vh] w-full ${widthClass} flex-col overflow-hidden rounded-n border border-border-1 bg-bg-1-light shadow-high outline-none ${enterClass}`}
      >
        {/* Close indicator, pinned to the panel's top-right corner. */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-s top-s flex h-8 w-8 items-center justify-center rounded-s text-fg-2 transition-colors duration-fast ease-out hover:bg-bg-hover hover:text-fg-1"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        {/* Title and actions stay fixed; only the content scrolls when the
            modal is taller than its max height (capped at 90vh above).
            "bar" layout divides them with full-width lines; "plain" inlines. */}
        {bar ? (
          <>
            <header className="flex h-14 shrink-0 items-center border-b border-border-1 px-l">
              <h3 className="text-l">{title}</h3>
            </header>
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-l py-m"
            >
              {children}
            </div>
            {actions && (
              <footer className="flex h-14 shrink-0 items-center justify-end gap-s border-t border-border-1 px-l">
                {actions}
              </footer>
            )}
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col p-l">
            <h3 className="shrink-0 text-l">{title}</h3>
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-s"
            >
              {children}
            </div>
            {actions && (
              <div className="mt-l flex shrink-0 justify-end gap-s">
                {actions}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
