# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with HMR
npm run build        # Type-check + build for production (tsc -b && vite build)
npm run lint         # Run ESLint
npm run preview      # Preview production build locally
npm test             # Run tests once (vitest run)
npm run test:watch   # Run tests in watch mode
```

## Architecture

Browser-only React 19 + TypeScript + Vite app for triggering CI pipelines (GitHub Actions workflow dispatch, CircleCI pipelines) via personal access tokens. All state is persisted to `localStorage`. Deployed to Cloudflare Pages at `ci-trigger-ui.pages.dev`.

### Data layer (`src/lib/`)

- **`types.ts`** — all shared types. Key types: `ProviderConfig` (id, name, type, token, baseUrl?), `SavedAction` (id, name, providerId, type, config, pinned?), `RunLog` (id, actionId, startedAt, status, requestPayload, responsePayload?, error?, url?)
- **`providerMeta.ts`** — dependency-free source of truth for provider metadata. Defines `PROVIDER_META as const` from which `ProviderType` and `ActionType` unions are derived. No imports — avoids circular deps.
- **`providers.ts`** — provider registry. Each `ProviderDef` entry contains: `buildCardInfo`, `buildFormState`, `buildCurl`, `buildRequest`, `buildResultUrl`, `mergeParams`, and optional `fetchRunUrl` (GitHub only — polls runs API after dispatch to get specific run URL). Exports: `PROVIDERS`, `getProviderDef(type)`, `getProviderDefByActionType(actionType)`.
- **`runner.ts`** — `triggerAction(action, provider, onComplete?)` — shared fetch + log logic used for bulk run. Does not call `fetchRunUrl` (use `ActionPanelCard.handleRun` for interactive single runs with UI feedback).
- **`storage.ts`** — CRUD wrappers over `localStorage` with keys `ci-trigger.providers`, `ci-trigger.actions`, `ci-trigger.runLogs`. Run logs capped at 100 entries, newest-first. Key exports: `appendRunLog`, `updateRunLogUrl`, `deleteRunLog`, `clearRunLogs`, `setActions`, `setProviders`.
- **`utils.ts`** — `createId()`, `formatDateTime(iso)`, `parseErrorMessage(raw)` (extracts `.message` from JSON error strings like `"401: {"message":"Bad credentials"}"`)
- **`toast.ts`** — module-level singleton emitter (no React context). Call `toast(message, status?)` anywhere.

### Component tree

```
App.tsx                         ← owns providers/actions/logs state, import/export/merge, providers modal
├── ProviderPanel.tsx           ← provider CRUD (rendered inside Modal from App header button)
├── ActionsPanel.tsx            ← action grid + search + bulk run + drag-to-reorder (dnd-kit)
│   └── ActionPanelCard.tsx     ← card: checkbox, pin, run, curl, ··· menu (fork/edit/delete/run-with-params)
├── RunLogsPanel.tsx            ← grid of log cards, filter tabs, per-card delete
└── Toaster.tsx                 ← fixed toast overlay
```

**Shared UI:** `Modal.tsx` (Escape + backdrop close), `JsonEditor.tsx` (textarea + format button + live validation)

### State management pattern

`App.tsx` uses lazy `useState` initializers (`useState(getProviders)`, `useState(getActions)`, `useState(getRunLogs)`). After any mutation, state is refreshed by calling the storage getter: `setProviders(getProviders())`.

### API calls

- **GitHub workflow dispatch:** `POST /repos/{owner}/{repo}/actions/workflows/{workflowId}/dispatches` — returns 204. After dispatch, `fetchRunUrl` polls the runs API (~2s delay) to get the specific run URL, then updates both UI state and the run log via `updateRunLogUrl`.
- **CircleCI pipeline:** `POST /project/{projectSlug}/pipeline` — returns JSON with `number`; result URL uses `number` for the exact pipeline URL.
- **CircleCI CORS:** Browser can't call CircleCI directly. Uses `VITE_CIRCLECI_PROXY` env var (Cloudflare Worker URL) in production. Falls back to `https://circleci.com/api/v2`. GitHub API works directly from the browser.

### Drag-to-reorder

`ActionsPanel` uses `@dnd-kit/core` + `@dnd-kit/sortable` with `rectSortingStrategy` for grid reordering. Each card is wrapped in a `SortableCard` component. Drag handle (grip icon) is passed as `dragHandle` prop to `ActionPanelCard`. On `DragEnd`, updated order is saved via `storeActions`.

### Import/Export

Export has two modes: with tokens (personal backup) and without tokens (team sharing — sets `token: ""`). Import **merges** by id — new items are added, existing items are updated, and provider tokens are preserved if the imported token is empty.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js`. All custom tokens defined in `src/index.css` under `@theme`. Atom One Dark palette: `atom-bg`, `atom-surface`, `atom-raised`, `atom-border`, `atom-fg`, `atom-fg-sub`, `atom-fg-muted`, `atom-blue`, `atom-green`, `atom-red`, `atom-yellow`, `atom-purple`, `atom-cyan`, `atom-orange`. Global scrollbar style in `index.css`: thin, `atom-border` color.

### SVG icons

`public/icons.svg` — SVG sprite with `github-icon`, `circleci-icon`. Use `text-atom-*` (not `fill-atom-*`) on the `<svg>` element since paths use `fill="currentColor"`.

### Path alias

`@/` → `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).

### Tests

`src/lib/providers.test.ts` — 28 tests covering `buildCardInfo`, `buildResultUrl`, `buildRequest`, `buildCurl`, `mergeParams` for both GitHub and CircleCI providers. Uses Vitest with `environment: "node"`. `vite.config.ts` imports `defineConfig` from `vitest/config` (not `vite`) to support the `test` field.
