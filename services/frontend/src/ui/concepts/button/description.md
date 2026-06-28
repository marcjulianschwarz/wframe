<!-- @ui-source: concepts/button@0.1.0 -->
<!-- Managed copy. Edits here are local to this app. -->
<!-- Improvements belong back in the ui repo's concepts/button — port
<!-- them there and bump the version. Do not treat this as throwaway code. -->
# Button

The styling is token-driven and swappable.

- Variants to encode intent:
  - `default`
  - `primary`
  - `ghost` -> secondary/dismiss actions
  - `danger` -> destructive actions

- Tactile press
  - `active:translate-y-px` plus a shadow drop on press gives a physical "click" feeling. Transitions are fast (`duration-fast`) so it stays snappy.
- Hover lifts the button
- Disabled button can't be clicked and clearly reads as inert.
- It's a real `<button>` element. Spreads `ButtonHTMLAttributes`, so `onClick`, `type`, `aria-*`, etc. all pass through and keyboard/focus behavior is native.

## Why it feels good

The press-down + hover-lift pair gives every click physical feedback without animation that gets in the way. Because intent is carried by the variant, a UI built from these buttons stays legible: you can tell what's safe and what's destructive at a glance.
