// @ui-source: concepts/dropdown-menu@0.2.0
// Managed copy. Edits here are local to this app.
// Improvements belong back in the ui repo's concepts/dropdown-menu — port
// them there and bump the version. Do not treat this as throwaway code.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type DropdownAlign = "start" | "end";

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  menuId: string;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown(part: string): DropdownContextValue {
  const ctx = useContext(DropdownContext);
  if (!ctx) {
    throw new Error(`<${part}> must be rendered inside <DropdownMenu>`);
  }
  return ctx;
}

export interface DropdownMenuProps {
  children: ReactNode;
}

/**
 * A dropdown menu: a trigger that toggles a floating list of actions. Closes on
 * Escape, outside click, or after an item is chosen. Roving focus with the
 * arrow keys; Home/End jump to the first/last item. Self-contained — no
 * theme-system dependency; colors, radius and shadow come from tokens.
 *
 * Compose it:
 *   <DropdownMenu>
 *     <DropdownTrigger>Options</DropdownTrigger>
 *     <DropdownContent>
 *       <DropdownItem onSelect={…}>Rename</DropdownItem>
 *       <DropdownSeparator />
 *       <DropdownItem destructive onSelect={…}>Delete</DropdownItem>
 *     </DropdownContent>
 *   </DropdownMenu>
 */
export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const value = useMemo(
    () => ({ open, setOpen, triggerRef, menuId }),
    [open, menuId],
  );

  return (
    <DropdownContext.Provider value={value}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownContext.Provider>
  );
}

export interface DropdownTriggerProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "onKeyDown"
  > {
  children: ReactNode;
}

// The default bordered/raised look. Pass `className` to extend it, or set
// `unstyled` to drop it entirely (e.g. for an icon-only "⋯" trigger).
const TRIGGER_BASE =
  "inline-flex items-center justify-center gap-s rounded-md border border-ui-border bg-ui-surface-raised px-m py-s text-m font-semibold leading-none text-ui-primary transition-all duration-fast ease-out hover:bg-ui-surface-hover hover:border-ui-border-strong active:bg-ui-surface-active";

/**
 * The control that toggles the menu. Renders a `<button>` so it's focusable and
 * keyboard-operable out of the box; ArrowDown opens the menu and lands on the
 * first item. Forwards standard button attributes (`aria-label`, `disabled`,
 * `title`, …). Pass `unstyled` to supply your own look via `className`.
 */
export function DropdownTrigger({
  children,
  className = "",
  unstyled = false,
  ...rest
}: DropdownTriggerProps & { unstyled?: boolean }) {
  const { open, setOpen, triggerRef, menuId } = useDropdown("DropdownTrigger");

  return (
    <button
      {...rest}
      ref={triggerRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onClick={() => setOpen(!open)}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          setOpen(true);
        }
      }}
      className={`${unstyled ? "" : TRIGGER_BASE} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export interface DropdownContentProps {
  children: ReactNode;
  /** Which trigger edge the menu aligns to. Defaults to "start" (left). */
  align?: DropdownAlign;
}

/**
 * The floating panel. Mounted only while open. Owns the keyboard navigation,
 * Escape and outside-click dismissal, and moving focus onto the first item when
 * it opens (returning focus to the trigger on close).
 */
export function DropdownContent({ children, align = "start" }: DropdownContentProps) {
  const { open, setOpen, triggerRef, menuId } = useDropdown("DropdownContent");
  const menuRef = useRef<HTMLDivElement>(null);

  // Move focus onto the first enabled item when the menu opens; restore focus
  // to the trigger when it closes.
  useEffect(() => {
    if (!open) return;
    const items = getItems(menuRef.current);
    items[0]?.focus();
    return () => triggerRef.current?.focus();
  }, [open, triggerRef]);

  // Escape closes; outside click (pointer down anywhere but the menu or the
  // trigger) closes too.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, setOpen, triggerRef]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = getItems(menuRef.current);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (e.key === "ArrowDown") next = (current + 1) % items.length;
    else if (e.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    items[next]?.focus();
  }, []);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-orientation="vertical"
      onKeyDown={onKeyDown}
      className={`absolute z-50 mt-xs min-w-40 origin-top overflow-hidden rounded-n border border-ui-border bg-ui-surface-raised shadow-high outline-none animate-modal-pop ${
        align === "end" ? "right-0" : "left-0"
      }`}
    >
      {children}
    </div>
  );
}

export interface DropdownItemProps {
  children: ReactNode;
  /** Invoked when the item is chosen (click or Enter/Space). Closes the menu. */
  onSelect?: () => void;
  /** Styles the item in the danger color for destructive actions. */
  destructive?: boolean;
  disabled?: boolean;
}

/** A single actionable row in the menu. */
export function DropdownItem({
  children,
  onSelect,
  destructive = false,
  disabled = false,
}: DropdownItemProps) {
  const { setOpen } = useDropdown("DropdownItem");

  const choose = () => {
    if (disabled) return;
    onSelect?.();
    setOpen(false);
  };

  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      data-dropdown-item=""
      onClick={choose}
      // Move focus to whichever item the mouse is over, so the keyboard's
      // focus highlight follows the pointer instead of leaving two rows lit.
      onMouseEnter={(e) => e.currentTarget.focus()}
      className={`flex w-full items-center gap-s px-m py-s text-left text-m outline-none transition-colors duration-fast ease-out disabled:opacity-50 disabled:pointer-events-none ${
        destructive
          ? "text-ui-danger focus:bg-ui-surface-hover"
          : "text-ui-primary focus:bg-ui-surface-hover"
      }`}
    >
      {children}
    </button>
  );
}

/** A horizontal rule grouping related items. */
export function DropdownSeparator() {
  return <div role="separator" className="h-px bg-ui-border" />;
}

/** A non-interactive group heading. */
export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-m py-xs text-s font-semibold text-ui-secondary">
      {children}
    </div>
  );
}

// Collect the focusable, enabled menu items in DOM order.
function getItems(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>("[data-dropdown-item]:not([disabled])"),
  );
}
