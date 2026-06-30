<!-- @ui-source: concepts/sidebar@0.2.0 -->
<!-- Managed copy. Edits here are local to this app. -->
<!-- Improvements belong back in the ui repo's concepts/sidebar — port -->
<!-- them there and bump the version. Do not treat this as throwaway code. -->
# Sidebar

A token-driven app shell sidebar — the left rail that holds primary navigation
plus a pinned footer (user info, sign-out, theme switcher).

- **Pure presentational.** `SidebarItem` is a `<button>`. The consumer owns
  routing: pass `active` and an `onClick` that navigates. No router dependency,
  so the concept drops into any app (or none).
- **Composable, not configured.** `Sidebar` takes `title`, `children` (the nav
  items), and a `footer` slot pinned to the bottom with `mt-auto`. No fixed nav
  schema — the app owns its links.
- **Icons optional.** Pass any node as `icon` (e.g. a lucide icon, sized at the
  call site).
- **Token-only styling.** Surfaces (`bg-ui-surface-sunken`, hover
  `bg-ui-surface-hover`), border (`border-ui-border`), and the selected state
  (`bg-ui-accent-soft` / `text-ui-accent`) all come from the token contract.

## Usage

```tsx
const { pathname } = useLocation();
const navigate = useNavigate();

<div className="flex min-h-screen text-ui-primary">
  <Sidebar
    title="wframe"
    footer={
      <SidebarItem icon={<LogOut size={16} />} onClick={logout}>
        Sign out
      </SidebarItem>
    }
  >
    <SidebarItem
      icon={<Store size={16} />}
      active={pathname.startsWith("/store")}
      onClick={() => navigate("/store")}
    >
      Store
    </SidebarItem>
  </Sidebar>
  <main className="flex-1 overflow-x-hidden">{/* routes */}</main>
</div>
```

## Changelog

- **0.2.0** — `SidebarItem` is now a plain `<button>` with `active`/`onClick`;
  the consumer owns routing. No router dependency.
- **0.1.0** — initial sidebar with `Sidebar` and `SidebarItem`.
