# wframe frontend

Vite + React + TypeScript + Tailwind, design tokens from the system in CLAUDE.md.

## Run

```bash
cp .env.example .env
pnpm install
pnpm dev
```

## Layout

```
src/
  styles/tokens.css     CSS custom properties, light/dark, focus, motion
  components/           Button, Input, Card (token-driven)
  features/
    auth/               token login stub (any Bearer string works)
    dashboard/          DashboardSelector grid
    epaper/             EpaperPanel showing the public bitmap URL
  lib/api.ts            typed API client
  lib/auth.ts           token storage
  App.tsx               composes login → selector → preview
```

Tailwind config maps tokens (`bg-bg-1`, `text-fg-1`, `rounded-n`, `shadow-high`,
`duration-fast`, …) so components stay token-only — no raw colors or rem values.
