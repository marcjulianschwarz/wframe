<!-- @ui-source: concepts/card@0.1.1 -->
<!-- Managed copy. Edits here are local to this app. -->
<!-- Improvements belong back in the ui repo's concepts/card — port -->
<!-- them there and bump the version. Do not treat this as throwaway code. -->
# Card

A surface container that groups related content. Token-driven and swappable.

- Variants encode elevation/intent:
  - `raised` -> default; floats off the page with `shadow-normal` + hairline border
  - `outlined` -> flat, border only
  - `sunken` -> inset well on `surface-sunken`, recedes
  - `ghost` -> no chrome, just padding/layout
- Composable slots (all optional, use only what you need):
  - `CardHeader` -> title/description + trailing action, laid out with space-between
  - `CardTitle` / `CardDescription` -> consistent heading + supporting text
  - `CardContent` -> body, auto-spaced from the header
  - `CardFooter` -> actions row, separated by a subtle top rule
- `padding` prop (`none`/`s`/`m`/`l`) so the same card works dense or roomy; `none` lets media bleed to the edge.
- `interactive` makes the whole card a target: subtle shadow bump on hover + pointer cursor, snappy `duration-fast`.
- Plain `<div>` under the hood — spreads `HTMLAttributes`, so `onClick`, `role`, `aria-*`, `ref` all pass through.

## Why it feels good

Elevation is carried by the variant, so a page of cards reads as a clear hierarchy at a glance — raised things are actionable, sunken things are containers. The slot components keep every card's internal rhythm identical, so a grid of cards stays visually aligned without per-card tweaking.

## Changelog

- 0.1.1 — Softened `interactive` state: no lift/border emphasis, just a shadow bump on hover.
- 0.1.0 — Initial card with `raised`/`outlined`/`sunken`/`ghost` variants, header/title/description/content/footer slots, `padding` + `interactive` props.
