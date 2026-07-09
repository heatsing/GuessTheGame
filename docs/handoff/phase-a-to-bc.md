# Handoff: Phase A → Phase B/C (Engineer)

> Date: 2026-07-09 · From: Frontend Infrastructure Engineer · To: Content Architect, Game Engine Engineer

## What was delivered

- Next.js 15.1 App Router project with TypeScript strict mode
- Tailwind CSS v4 with design tokens from UX spec
- Global layout (Header, Footer, BottomNav) with semantic HTML
- 6 base UI components: Button, Card, Modal, Toast, Skeleton, ErrorState
- 12 shell page routes (all static-generated)
- Vitest + Testing Library test environment with 35 passing tests
- All gates green: typecheck, lint, test, build

## Directory structure

```
src/
  app/                    # Next.js App Router pages
    layout.tsx            # Root layout (Header + main + Footer + BottomNav)
    globals.css           # Design tokens + base styles + component styles
    page.tsx              # Home
    daily/page.tsx
    play/keywords/page.tsx
    play/emoji/page.tsx
    play/screenshot/page.tsx
    play/timeline/page.tsx
    archive/page.tsx
    archive/[date]/page.tsx
    stats/page.tsx
    how-to-play/page.tsx
    about/page.tsx
    share/[result-id]/page.tsx
  components/
    layout/               # SiteHeader, SiteFooter, BottomNav
    ui/                   # Button, Card, Modal, Toast, Skeleton, ErrorState (+ tests)
  test/setup.ts           # Vitest setup (jest-dom matchers)
```

## Key decisions

1. **Tailwind v4** via `@tailwindcss/postcss` — design tokens defined as CSS custom properties in `globals.css`, not in a Tailwind config
2. **Components use inline styles** referencing `var(--token)` — keeps token source-of-truth in one place, no Tailwind config duplication
3. **`output: 'export'` enabled** — static export is configured by default per ADR-001. On Windows, real-time antivirus (Defender) can create phantom files in the `_not-found` chunk; `scripts/build.mjs` detects this and falls back to a non-export build for local verification. CI/Vercel (Linux) builds export correctly.
4. **Next.js 15.5.20** — upgraded from 15.1.0 for latest App Router patches
5. **zod added** as dependency for Phase B content validation
6. **Custom `not-found.tsx`** — accessible 404 page with design-system styling
7. **Dark mode** — single dark theme via `color-scheme: dark` (PRD §4.2: no toggle in MVP)

## For the Content Architect

- Content files should go in `src/data/` (per architecture.md)
- Use zod (already installed) for schema validation
- Validation scripts go in `scripts/` directory
- Content loaders should be in `src/lib/content/`
- Engine must not import React/UI components

## For the Game Engine Engineer

- Engine code goes in `src/lib/engine/`
- Pure functions only — no React, no localStorage, no DOM access
- Must be testable in Node (vitest)
- See PRD §7 for exact scoring formulas
- See PRD §5 for game rules per mode

## Verification commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run test        # vitest run
npm run build       # scripts/build.mjs (export with Windows fallback)
npm run build:export # next build (explicit export, no fallback)
```
