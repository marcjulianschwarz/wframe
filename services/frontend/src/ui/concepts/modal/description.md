<!-- @ui-source: concepts/modal@0.5.4 -->
<!-- Managed copy. Edits here are local to this app. -->
<!-- Improvements belong back in the ui repo's concepts/modal — port -->
<!-- them there and bump the version. Do not treat this as throwaway code. -->
# Modal

A modal overlays content above the page and demands a decision before the user continues.

## Interaction Model

- Backdrop closes on outside click. Use `onMouseDown` (not `onClick`) so a drag that starts inside the panel and releases on the backdrop doesn't close it.
- `Escape` closes. A document-level `keydown` listener, added on mount and cleaned up on unmount. Don't attach it to the panel as focus may not be there.
- Scroll lock. The page behind should not scroll.
- Move focus in. On open, focus the panel. Also trap focus and restore it to the trigger on close.
- Semantics. `role="dialog"` + `aria-modal="true"`

## Theming

- Color, radius, and shadow come from tokens.
- Enter animation
  - slide
  - fade
  - pop (springy scale overshoot — the panel scales up past full size then settles, via a `cubic-bezier(0.34, 1.56, 0.64, 1)` easing).
  - The backdrop itself does **not** fade — it paints opaque on the first frame; only the panel animates. This keeps the dim solid when one modal is swapped for another in the same commit (close A, open B) instead of flashing the page through a transparent backdrop.
- Layout variant
  - plain (title, content and actions stacked with padding)
  - bar (title in a header bar and the actions in a footer bar, each divided from the content by a full-width line.

## Dependencies

- Builds on the Button primitive for the trigger and the footer actions

## Why it feels good

The combination of scroll lock + backdrop dim + focus move. Closing on both Escape and outside-click means the user never feels trapped.

## Changelog

- **0.5.4** — Backdrop scrim now uses the `--color-overlay` token (bg-ui-overlay) instead of a hardcoded `bg-black/40`; deepens in dark mode.
- **0.5.3** — Backdrop no longer fades in (it paints opaque immediately); only the panel animates. Stops the white flash when one modal is swapped for another in the same commit.
- **0.5.2** — Block wheel/touch scroll over the backdrop margin so the background can't scroll at all.
- **0.5.1** — Contain scroll (`overscroll-contain`) so the background never scrolls behind the modal.
- **0.5.0** — Cap panel height at 90vh and scroll the content; title/actions stay fixed.
- **0.4.0** — Add a `width` prop (`sm`/`md`/`lg`/`xl`) so the panel can grow; defaults to `sm`.
- **0.3.0** — Add a close (✕) indicator pinned to the panel's top-right corner.
- **0.2.0** — Split into a reusable `component.tsx` + gallery `preview.tsx`.
- **0.1.0** — Initial version: focus trap, Escape/outside-click close, scroll lock, slide/fade/pop enter (recipe-driven).
