# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Type-check + build for production (tsc -b && vite build)
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

No test framework is configured.

## Architecture

This is a browser-only React + TypeScript + Vite app for triggering CI pipelines (GitHub Actions, CircleCI) via personal access tokens stored in `localStorage`.

**Data flow:**
- `src/lib/types.ts` — all shared types (`ProviderConfig`, `SavedAction`, `RunLog`, etc.)
- `src/lib/storage.ts` — thin read/write wrappers over `localStorage` with keys prefixed `ci-trigger.*`; run logs are capped at 100 entries and stored newest-first
- `src/app/App.tsx` — root component; owns `providers` and `actions` state, loads from storage on mount, passes CRUD handlers down to panels
- `src/components/ProviderPanel.tsx` — form + list for managing CI providers (GitHub / CircleCI) with optional `baseUrl` override
- `src/components/ActionsPanel.tsx` — form + list for managing GitHub workflow-dispatch actions; CircleCI action type is defined in types but not yet rendered

**Path alias:** `@/` maps to `src/` (configured in `vite.config.ts`).

**Styling:** Tailwind CSS v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed.

**Key design note:** Tokens are intentionally stored in plain `localStorage` — this is a personal MVP, not a shared/production tool.
