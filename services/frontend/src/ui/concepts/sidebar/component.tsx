// @ui-source: concepts/sidebar@0.2.0
// Managed copy. Edits here are local to this app.
// Improvements belong back in the ui repo's concepts/sidebar — port
// them there and bump the version. Do not treat this as throwaway code.
import { type ReactNode } from "react";

/**
 * A token-driven app shell sidebar — left rail with nav items and a pinned
 * footer (user info, sign-out, theme switcher).
 *
 * Pure presentational: items are `<button>`s. The consumer owns routing —
 * pass `active` and an `onClick` that navigates.
 *
 *   <Sidebar
 *     title="wframe"
 *     footer={<SidebarItem icon={<LogOut />} onClick={logout}>Sign out</SidebarItem>}
 *   >
 *     <SidebarItem
 *       icon={<Store />}
 *       active={pathname.startsWith("/store")}
 *       onClick={() => navigate("/store")}
 *     >
 *       Store
 *     </SidebarItem>
 *   </Sidebar>
 */

interface SidebarProps {
  /** Brand / app name shown at the top. */
  title?: ReactNode;
  /** Nav items — typically `SidebarItem`s. */
  children: ReactNode;
  /** Pinned to the bottom (user info, sign-out, theme switcher). */
  footer?: ReactNode;
  className?: string;
}

export function Sidebar({ title, children, footer, className = "" }: SidebarProps) {
  return (
    <aside
      className={`flex w-64 shrink-0 flex-col border-r border-ui-border bg-ui-surface-sunken ${className}`}
    >
      <div className="p-m">
        {title != null && <h1 className="mb-m text-l">{title}</h1>}
        <nav className="flex flex-col gap-xs">{children}</nav>
      </div>
      {footer != null && (
        <div className="mt-auto border-t border-ui-border p-m">{footer}</div>
      )}
    </aside>
  );
}

interface SidebarItemProps {
  icon?: ReactNode;
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export function SidebarItem({ icon, children, active, onClick }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-s rounded-n px-n py-s text-left text-m transition-colors duration-fast ${
        active
          ? "bg-ui-accent-soft text-ui-accent"
          : "text-ui-secondary hover:bg-ui-surface-hover hover:text-ui-primary"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
