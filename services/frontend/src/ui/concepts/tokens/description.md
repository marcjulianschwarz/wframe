<!-- @ui-source: concepts/tokens@0.1.0 -->
<!-- Managed copy. Edits here are local to this app. -->
<!-- Improvements belong back in the ui repo's concepts/tokens — port
<!-- them there and bump the version. Do not treat this as throwaway code. -->
# Design Tokens

The shared styling layer. Every other concept is written against **token names**
(`bg-bg-1`, `text-fg-danger`, `duration-fast`) — never raw colors or sizes — so
components are portable and an app restyles everything by changing values in one
place.

## Contract vs. values — the important distinction

This concept has two parts that are shared very differently:

- **The contract** — the *set of token names* (the `--…` variables and their
  Tailwind mapping in `tailwind.config.js`). This is what every component
  depends on. It must stay the **same across apps**: if an app renames or drops
  a token a component uses, that component breaks. `ui check` enforces this.
- **The values** — the actual purple, the exact success-green, the spacing
  scale. This is **brand**, and it's *meant* to differ per app. Override freely.

So when you copy this concept into an app, **keep the token names, change the
values**. Mark each value you change with an `@ui-exception:` so `ui check`
permits your brand while still flagging any drift in the contract itself:

```css
--highlight-color: #1e88e5; /* @ui-exception: this app's brand blue */
```

## How it's wired

1. `tokens.css` declares the CSS variables (light + dark via `color-scheme`).
2. `tailwind.config.js` maps them to utilities (`bg-bg-1`, `text-fg-1`, …).
3. Components only ever use the utilities, so changing a value in `tokens.css`
   restyles every component at once.

## Adding a token

Adding a token *is* a contract change — do it here, bump the version, and note
it in the changelog so apps know to adopt it. Add the `--var` to `tokens.css`
**and** the matching utility to `tailwind.config.js` in the same change.

## Changelog

- **0.1.0** — Initial token contract: backgrounds, foregrounds, borders,
  highlight, status colors, type scale, spacing, radius, shadow, motion.
