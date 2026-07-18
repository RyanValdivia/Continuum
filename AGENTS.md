# Coding Guide

## Code review

Before finishing a change, follow the project's review conventions in
[`@docs/code-review/`](./docs/code-review/) — the invariants a reviewer (human or
agent) enforces on this codebase:

- [`docs/code-review/README.md`](./docs/code-review/README.md) — architecture recap & wire rules.
- [`docs/code-review/types-schemas.md`](./docs/code-review/types-schemas.md) — zod as the single type source; **never re-export types**.
- [`docs/code-review/frontend-data-fetching.md`](./docs/code-review/frontend-data-fetching.md) — Eden proxy; **one factory hook per domain**.
- [`docs/code-review/tables-and-forms.md`](./docs/code-review/tables-and-forms.md) — **data-table toolkit** (useDataTable + RSC) & **TanStack Form** (useAppForm + Field).

## Project Shape

- Single Next 16 app at the repo root (`src/`), managed with pnpm. Package name `hackaton-starter`.
- Domains live under `src/core/<domain>/`; keep new code inside the relevant domain.

| Layer | Holds |
|-------|-------|
| `domain/` | zod `schemas.ts` + inferred `types.ts` (single type source), `__tests__/` |
| `server/repository/` | Drizzle access (`import "server-only"` + shared `db`), ownership-scoped by `userId` |
| `server/services/` | orchestration, returns `AsyncAppResult<T>`, enforces ownership |
| `server/api/` | Elysia leaf `*.route.ts` + a domain `router.ts` (the prefix lives on the router) |
| `client/` | Eden/TanStack-Query hooks + shadcn UI |

Wire rules: every response is the `CommonResponse` envelope; expected 4xx are
`err(AppErrors.x)` values, never throws; authed routes carry both `.use(authed)`
and `authed: true`. A domain router isn't live until it's `.use()`d in
`src/server/router.ts`.

## Commands

- Install dependencies from the repo root: `pnpm install`.
- Run dev server: `pnpm dev` (http://localhost:3000).
- Build: `pnpm build`.
- Lint/format check (Biome): `pnpm check`. Apply safe fixes: `pnpm check:fix`.
- Types: `pnpm typecheck`. Tests: `pnpm test`.
- Database: `pnpm db:generate` · `pnpm db:migrate` · `pnpm db:studio`.

## Code Style

- Use Biome, not ESLint. Do not add ESLint config or scripts.
- Preserve 4-space indentation and existing naming/import style.
- Prefer small, focused changes. Do not refactor unrelated code while fixing or adding a feature.
- Keep files under 500 lines. Split large files into smaller modules, components, hooks, or helpers whenever practical.
- Do not use `any`, `as any`, `as unknown as`, `@ts-ignore`, or `@ts-expect-error` to silence type errors.
- Prefer explicit types, clear names, pure helpers, early returns, and narrow module boundaries.
- Keep business logic out of UI components when it can live in typed utilities, hooks, or server modules.

## Rule: TSDoc is opt-in, not mandatory

Do NOT generate TSDoc for every exported symbol.

Only document APIs when the documentation adds information that cannot be immediately inferred from:

- the function name;
- parameter names;
- types;
- file name;
- surrounding code.

Good candidates include:

- reusable libraries
- shared utilities
- hooks with non-obvious behavior
- business rules
- caching semantics
- concurrency guarantees
- side effects
- invariants
- performance characteristics
- security-sensitive code
- public SDK APIs

Do NOT document:

- React components
- Next.js pages
- layout components
- presentational components
- simple wrappers
- obvious getters/setters
- obvious CRUD helpers

If the summary would simply restate the function name, omit the TSDoc entirely.

Prefer expressive code over explanatory comments.

## Styling (CSS variables & Tailwind)

- `src/app/globals.css` is the single source of truth for design tokens (colors, radius, shadow, semantic roles). Read it before styling.
- Do NOT create new CSS custom properties (`--var`) without owner approval.
- Never hardcode palette colors (`text-rose-600`, `bg-emerald-50`, `bg-zinc-900`, `text-white`, etc.). Map to semantic tokens: red/rose → `destructive`, neutrals → `muted`/`secondary`/`border`/`card`, brand → `primary`. Use the `/10` opacity form for soft tinted surfaces (`bg-destructive/10`).
- No manual `dark:` color overrides — the theme inverts automatically through token roles.
- Prefer Tailwind v4 scale utilities over arbitrary px. Use arbitrary px only when necessary (px not divisible by 4 with no scale step, font sizes with no named step, real units like `rem`/`ch`/`vh`/`%`, `leading-[..]`, `tracking-[..]`).
- Unknown Tailwind utilities fail silently (no CSS, no build error). After introducing a dynamic step, confirm it emits a rule.
- Do not restyle `src/frontend/components/ui/*` (vendored shadcn primitives).

## Next.js

- This repo uses Next 16. Do not assume older Next.js APIs or file conventions.
- Before changing Next.js behavior, read the relevant guide in `node_modules/next/dist/docs/` and follow current deprecation notes.

## Data fetching (Eden options proxy)

- **Mandatory in client hooks/components:** reach the API through the `useElysia()` options proxy. Bind once (`const client = useElysia()[domain]`), then use `client.<proc>.queryOptions(...)` for `useQuery` and `client.<proc>.mutationOptions(...)` for `useMutation`. Read results from the response envelope (`data.response`).
- One factory hook per domain: `useXxx = () => ({ useList, useGetById, useCreate, useUpdate, useDelete })`. See [`docs/code-review/frontend-data-fetching.md`](./docs/code-review/frontend-data-fetching.md).
- **Do not** import or call the raw `apiClient` treaty client inside a React hook or component. `apiClient` is allowed only in non-hook contexts (provider wiring). Server prefetch uses `ServerEden`, not `apiClient`.
- **No `as unknown as <Module>Proxy` casts.** `useElysia().<domain>` is already typed as the proxy.

## Testing (Test placement)

- Do NOT place test files (`*.test.ts`, `*.spec.ts`) directly alongside production code at the root of a module or route.
- Group tests inside a local `__tests__` folder within the same directory as the code they test. Keep import paths relative (e.g., `import { POST } from "../route"`).

## Verification

- After code changes, run diagnostics/checks for touched files when available, then run `pnpm check` and `pnpm typecheck`.
- Run `pnpm build` for changes that affect app runtime, routing, config, server code, or build output.
- For UI changes, verify the app in a browser at `http://localhost:3000`.
