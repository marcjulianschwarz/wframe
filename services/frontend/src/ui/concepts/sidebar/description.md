<!-- @ui-source: concepts/sidebar@0.3.0 -->
<!-- Managed copy. Edits here are local to this app. -->
<!-- Improvements belong back in the ui repo's concepts/sidebar — port -->
<!-- them there and bump the version. Do not treat this as throwaway code. -->
# Sidebar

A token-driven app shell sidebar — the left rail that holds primary navigation
plus a pinned footer (user info, sign-out, theme switcher). It sticks to the
viewport, scrolls its nav when long, can group items into sections, and
collapses to an icon-only strip without anything shifting or reflowing.

- **Pure presentational.** `SidebarItem` is a `<button>`. The consumer owns
  routing: pass `active` and an `onClick` that navigates. No router dependency,
  so the concept drops into any app (or none).
- **Composable, not configured.** `Sidebar` takes `title`, `children` (nav
  items and/or `SidebarSection`s), and a `footer` slot pinned to the bottom with
  `mt-auto`. No fixed nav schema — the app owns its links.
- **Sections.** Group items with `SidebarSection title="…"`. The heading renders
  as a small uppercase label, and collapses to a thin divider in icon-only mode.
  The heading box keeps a **fixed height** in both states, so collapsing the
  label never pulls the items below it upward.
- **Collapsible.** Pass `collapsed` + `onCollapsedChange` to render the built-in
  toggle. Collapsed, the rail shrinks (`w-64` → `w-16`), hides labels/title, and
  centers icons; each item keeps a `title` tooltip. Collapse is **controlled**,
  so the app can persist it (e.g. localStorage). Omit `onCollapsedChange` to hide
  the toggle.
- **Same height, both states.** Each `SidebarItem` is a **fixed height** (`h-11`)
  whether expanded or collapsed — never `py-*` + line-height, which measures
  differently per row. Collapsed items become an `h-11 w-11` square (so the
  active background is a square, not a tall pill) centered in the rail. Fixed
  height + fixed heading height means nothing shifts vertically when toggling.
- **No reflow on toggle.** The width animation is on the rail (`transition-[width]`),
  not on individual items. Any text that would be squeezed mid-animation —
  the title (`<h1>`) and item labels — is `whitespace-nowrap` so it can never
  wrap to a second line while the rail is narrowing/widening. Item labels are
  **absolutely positioned** (out of flex flow) so the animating width can't
  reflow them; they just fade (`opacity`) and are clipped by the item's
  `overflow-hidden`.
- **Scrollable nav.** The layout is three regions: a fixed header (title +
  toggle), a `flex-1 min-h-0 overflow-y-auto` **nav** that scrolls when the items
  exceed the rail height, and a fixed footer. Header and footer stay pinned; only
  the nav scrolls, so items are never clipped.
- **Sticky.** The rail is `sticky top-0 h-screen`, staying pinned while the main
  content scrolls. Override the height via `className` when embedding in a
  non-full-height container.
- **Icons optional** — but recommended, since collapsed mode shows only icons.
  Pass any node as `icon` (e.g. a lucide icon, sized at the call site). With no
  icon, provide a fallback (e.g. the label's initial) so the collapsed rail
  still reads.
- **Token-only styling.** Surfaces (`bg-ui-surface-sunken`, hover
  `bg-ui-surface-hover`), border (`border-ui-border`), and the selected state
  (`bg-ui-accent-soft` / `text-ui-accent`) all come from the token contract.

## Usage

```tsx
const { pathname } = useLocation();
const navigate = useNavigate();
const [collapsed, setCollapsed] = useState(false);

<div className="flex min-h-screen text-ui-primary">
  <Sidebar
    title="wframe"
    collapsed={collapsed}
    onCollapsedChange={setCollapsed}
    footer={
      <SidebarItem icon={<LogOut size={16} />} onClick={logout}>
        Sign out
      </SidebarItem>
    }
  >
    <SidebarSection title="Workspace">
      <SidebarItem
        icon={<Store size={16} />}
        active={pathname.startsWith("/store")}
        onClick={() => navigate("/store")}
      >
        Store
      </SidebarItem>
    </SidebarSection>
  </Sidebar>
  <main className="flex-1 overflow-x-hidden">{/* routes */}</main>
</div>
```

## Changelog

- **0.3.0** — added `SidebarSection` for grouping, a controlled collapse toggle
  (`collapsed` / `onCollapsedChange`) for an icon-only rail, a scrollable nav
  region, and sticky (`sticky top-0 h-screen`) positioning. Items are a fixed
  height in both states (square when collapsed), and labels/title are
  nowrap + absolutely positioned so nothing shifts or reflows on toggle.
- **0.2.0** — `SidebarItem` is now a plain `<button>` with `active`/`onClick`;
  the consumer owns routing. No router dependency.
- **0.1.0** — initial sidebar with `Sidebar` and `SidebarItem`.
