<!-- @ui-source: concepts/dropdown-menu@0.2.1 -->
<!-- Managed copy. Edits here are local to this app. -->
<!-- Improvements belong back in the ui repo's concepts/dropdown-menu — port -->
<!-- them there and bump the version. Do not treat this as throwaway code. -->
# Dropdown Menu

A dropdown menu hangs a short list of actions off a trigger. It opens on demand, takes a single choice, and gets out of the way.

## Composition

Built from small parts you assemble at the call site, so the trigger label and the item set are yours to shape:

- `DropdownMenu` — the root; holds open state and positions the menu relative to the trigger.
- `DropdownTrigger` — the control that toggles the menu (a real `<button>`).
- `DropdownContent` — the floating panel; mounted only while open.
- `DropdownItem` — an actionable row. `onSelect` fires the action and closes the menu. `destructive` paints it in the danger color; `disabled` dims and skips it.
- `DropdownSeparator` / `DropdownLabel` — group and head related items.

## Interaction Model

- **Outside click closes.** A document-level `pointerdown` listener closes the menu unless the press lands on the menu or the trigger.
- **`Escape` closes.** Document-level `keydown`, added while open and cleaned up on close.
- **Choosing closes.** Any `DropdownItem` selection dismisses the menu.
- **Roving focus.** Opening moves focus to the first item; closing restores it to the trigger. `ArrowUp`/`ArrowDown` cycle, `Home`/`End` jump to the ends. Disabled items are skipped — they carry no `data-dropdown-item` slot in the focus ring.
- **Trigger keys.** `ArrowDown`/`ArrowUp` on the trigger open the menu and land on the first item.
- **Semantics.** `aria-haspopup="menu"` + `aria-expanded` on the trigger; `role="menu"` on the panel and `role="menuitem"` on each item.

## Theming

- Color, radius, and shadow come from tokens — no theme-system dependency.
- `align` (`start` / `end`) anchors the panel to the trigger's left or right edge.
- Enter animation: a springy `modal-pop` scale, anchored to the trigger by `origin-top`.

## Dependencies

- Standalone. The preview uses `lucide-react` icons for the trigger and items, but the component itself imports nothing from sibling concepts.

## Why it feels good

The menu never traps you: Escape, an outside click, or making a choice all dismiss it, and focus always returns to where it started. Keyboard users get full roving navigation for free.

## Changelog

- **0.2.1** — Trigger radius now uses the `rounded-ui-s` token instead of Tailwind's hardcoded `rounded-md`.
- **0.2.0** — `DropdownTrigger` now forwards standard button attributes (`aria-label`, `title`, `disabled`, …) and takes an `unstyled` prop so it can host a bare icon trigger (e.g. a `⋯` button) with the look supplied via `className`.
- **0.1.0** — Initial version: composable trigger/content/item/separator/label, outside-click + Escape dismissal, roving arrow-key focus, `align` start/end, `destructive` and `disabled` items, edge-to-edge rows with a `modal-pop` enter.
