// @ui-source: concepts/sidebar@0.3.0
// Managed copy. Edits here are local to this app.
// Improvements belong back in the ui repo's concepts/sidebar — port
// them there and bump the version. Do not treat this as throwaway code.
import { createContext, useContext, type ReactNode } from "react";

/**
 * A token-driven app shell sidebar — sticky left rail with nav items, optional
 * grouped sections, a pinned footer (user info, sign-out, theme switcher), and
 * a collapse toggle that shrinks the rail to an icon-only strip.
 *
 * Pure presentational: items are `<button>`s. The consumer owns routing —
 * pass `active` and an `onClick` that navigates. Collapse is controlled by the
 * consumer via `collapsed` / `onCollapsedChange`, so the state can be persisted.
 *
 *   const [collapsed, setCollapsed] = useState(false);
 *
 *   <Sidebar
 *     title="wframe"
 *     collapsed={collapsed}
 *     onCollapsedChange={setCollapsed}
 *     footer={<SidebarItem icon={<LogOut />} onClick={logout}>Sign out</SidebarItem>}
 *   >
 *     <SidebarSection title="Workspace">
 *       <SidebarItem
 *         icon={<Store />}
 *         active={pathname.startsWith("/store")}
 *         onClick={() => navigate("/store")}
 *       >
 *         Store
 *       </SidebarItem>
 *     </SidebarSection>
 *   </Sidebar>
 *
 * The rail is `sticky top-0 h-screen` so it stays pinned while the main
 * content scrolls. When embedded in a non-scrolling container, override the
 * height via `className`.
 */

const SidebarContext = createContext<{ collapsed: boolean }>({ collapsed: false });

interface SidebarProps {
  /** Brand / app name shown at the top. Hidden when collapsed. */
  title?: ReactNode;
  /** Nav items and/or `SidebarSection`s. */
  children: ReactNode;
  /** Pinned to the bottom (user info, sign-out, theme switcher). */
  footer?: ReactNode;
  /** Icon-only mode. Controlled — pair with `onCollapsedChange`. */
  collapsed?: boolean;
  /** Called when the built-in toggle is clicked. Omit to hide the toggle. */
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

export function Sidebar({
  title,
  children,
  footer,
  collapsed = false,
  onCollapsedChange,
  className = "",
}: SidebarProps) {
  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-ui-border bg-ui-surface-sunken transition-[width] duration-ui-base ${
          collapsed ? "w-16" : "w-64"
        } ${className}`}
      >
        {(title != null || onCollapsedChange != null) && (
          <div
            className={`flex shrink-0 items-center px-ui-m pt-ui-m ${
              collapsed ? "justify-center" : "justify-between"
            }`}
          >
            {!collapsed && title != null && (
              <h1 className="whitespace-nowrap text-ui-l">{title}</h1>
            )}
            {onCollapsedChange != null && (
              <button
                type="button"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                onClick={() => onCollapsedChange(!collapsed)}
                className="flex size-8 items-center justify-center rounded-ui-n text-ui-secondary transition-colors duration-ui-fast hover:bg-ui-surface-hover hover:text-ui-primary"
              >
                <ChevronsLeft collapsed={collapsed} />
              </button>
            )}
          </div>
        )}
        {/* Scrolls when the nav is taller than the viewport; header/footer stay put. */}
        <nav
          className={`flex min-h-0 flex-1 flex-col gap-ui-xs overflow-y-auto py-ui-m ${
            collapsed ? "px-ui-s" : "px-ui-m"
          }`}
        >
          {children}
        </nav>
        {footer != null && (
          <div className="shrink-0 border-t border-ui-border p-ui-m">{footer}</div>
        )}
      </aside>
    </SidebarContext.Provider>
  );
}

interface SidebarSectionProps {
  /** Section heading. Collapsed to a divider when the rail is icon-only. */
  title?: ReactNode;
  children: ReactNode;
}

export function SidebarSection({ title, children }: SidebarSectionProps) {
  const { collapsed } = useContext(SidebarContext);
  return (
    <div className="mt-ui-m flex flex-col gap-ui-xs first:mt-0">
      {title != null && (
        // Same box height in both states (matches the text-ui-s label line) so
        // collapsing the label doesn't pull the items below it upward.
        <div className="flex h-5 items-center px-ui-n">
          {collapsed ? (
            <div className="mx-auto h-px w-6 bg-ui-border" />
          ) : (
            <p className="truncate text-ui-s font-ui-medium uppercase tracking-ui-wide text-ui-secondary">
              {title}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

interface SidebarItemProps {
  icon?: ReactNode;
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export function SidebarItem({ icon, children, active, onClick }: SidebarItemProps) {
  const { collapsed } = useContext(SidebarContext);
  return (
    <button
      type="button"
      onClick={onClick}
      // Keep the tooltip + accessible name when the label is hidden.
      title={collapsed && typeof children === "string" ? children : undefined}
      // Fixed h-11 in BOTH states so items never change height/position when
      // collapsing. Collapsed is a w-11 square (mx-auto centered), so the active
      // background is square instead of a tall pill.
      className={`relative flex h-11 items-center overflow-hidden rounded-ui-n text-left text-ui-m ${
        collapsed ? "mx-auto w-11 justify-center px-ui-s" : "w-full px-ui-n"
      } ${
        active
          ? "bg-ui-accent-soft text-ui-accent"
          : "text-ui-secondary hover:bg-ui-surface-hover hover:text-ui-primary"
      }`}
    >
      {/* Fixed-size, non-shrinking icon slot. Alone in flow when collapsed, so
          justify-center centers it exactly in the square. */}
      {icon != null && (
        <span className="flex size-5 shrink-0 items-center justify-center leading-none">
          {icon}
        </span>
      )}
      {/* Absolutely positioned so it's OUT of flex flow: the animating rail
          width can never reflow or wrap it. It just fades and is clipped by the
          item's overflow-hidden. Left offset lines up after the icon. */}
      <span
        className={`pointer-events-none absolute left-11 whitespace-nowrap transition-opacity duration-ui-base ${
          collapsed ? "opacity-0" : "opacity-100"
        }`}
      >
        {children}
      </span>
    </button>
  );
}

/** Small inline chevron that flips with the collapsed state. No icon dep. */
function ChevronsLeft({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform duration-ui-base ${collapsed ? "rotate-180" : ""}`}
    >
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </svg>
  );
}
