# Handoff — Eden treaty type ceiling blocks `next build` after recruitment merge

**Date:** 2026-07-18
**Branch:** `main` (HEAD `a0f433b`)
**Status:** recruitment domain merged to main, all tests green, **`tsc`/`next build` fail on 7 type errors**. Runtime unaffected (`next dev` works).

---

## TL;DR for the next agent

The recruitment feature (offboarding → vacancy → CV ranking) is fully merged into `main` and all
**237 tests pass**. The **only** open problem: registering `recruitmentRouter` pushed the Eden
treaty `AppRouter` type past TypeScript's instantiation ceiling. The generated client tree now
types every domain **except one**, and `.notion` is the current casualty → 7 type errors, all in
the notion client. This breaks `pnpm typecheck` and `next build` (no `ignoreBuildErrors` set), so
**Vercel deploy is blocked** until fixed. It is a type-inference scaling issue, **not** a logic bug.

Your job: get `pnpm typecheck` (and thus `next build`) green **without** losing meaningful type
safety, then confirm deploy builds.

---

## Reproduce

```bash
cd /home/skkippie/work/AI-DO/Continuum
rm -rf .next            # stale .next/dev/types pollutes tsc — always clear when measuring
pnpm typecheck          # 7 errors, all in src/core/notion/client/*
```

Errors:
```
src/core/notion/client/hooks.ts(13,32): TS2339: Property 'notion' does not exist on type
  'DecoratePathSegments<{ projects: {...} } & ... 43 more ... & {...}, ExtractRout...'
src/core/notion/client/ui/notion-integration-card.tsx(39,30): TS2339: Property 'response' does not exist on type '{}'
  (and 5 more — all cascade from `.notion` resolving to a broken type in useNotion())
```

## Root cause (verified by isolation, not guessed)

The client type is built in `src/frontend/lib/eden.ts`:
```ts
const { EdenProvider, useEden } = createEdenTanStackQuery<AppRouter>();
const useElysia = () => useEden().api.v1;   // <-- DecoratePathSegments over the WHOLE tree
const apiClient = treaty<AppRouter>(BASE_URL);
```
`AppRouter = typeof app` from `src/server/router.ts`. The merge added `recruitmentRouter` (11 routes),
bringing the app to **51 routes across 7 domains**. The `DecoratePathSegments` intersection now
exceeds TS's depth budget and silently drops one branch.

Isolation experiments (all with clean `.next`):
- `main` (pre-merge, 40 routes): `pnpm typecheck` = **0 errors**.
- `main` (post-merge, 51 routes): **7 errors**, all notion.
- Replace `src/server/router.ts` with the pre-recruitment version (recruitment NOT registered):
  notion errors **vanish**, but 3 *recruitment*-client errors appear instead.
  → The tree can type `N-1` domains; the dropped one flips with what's registered. **It's the ceiling,
    not notion specifically.** Any future route addition can move the casualty.
- Reverting `src/core/knowledge/domain/schemas.ts` or removing only the `.use(recruitmentRouter)`
  line did **not** fix it — confirms it's the total registered-route type load, not one file.

## Why it's safe to ship the merge as-is (for `next dev` demo)

- Eden treaty is a **compile-time** Proxy type. At runtime `useElysia().notion({...})` works fine —
  the Proxy resolves paths dynamically. `next dev` serves the app with no issue.
- All 237 tests pass (`pnpm test`), including every recruitment service/schema test.
- Only Vercel `next build` (strict `tsc`) is gated.

## Fix options (pick one — recommendation first)

1. **Unblock build now (recommended for hackathon):** add to `next.config.ts`
   ```ts
   typescript: { ignoreBuildErrors: true },
   ```
   1 line, reversible, lets Vercel deploy today. Downside: `next build` stops type-checking
   entirely; keep `pnpm typecheck` in your loop (it still shows the 7). Open a follow-up for #2.

2. **Proper structural fix:** reduce treaty type cost so all domains fit under the ceiling. Two known
   levers for Eden "excessively deep":
   - Split the one mega client into **per-domain treaty clients** (e.g. `treaty<AppRouter>` narrowed,
     or separate typed roots per domain) so no single `DecoratePathSegments` spans all 51 routes.
   - Add **explicit `response` schemas** to routes so Eden stops deep-inferring return types
     (cuts per-route type weight). Start with the heaviest domains.
   Correct + keeps full type safety, but non-trivial and needs measurement after each change
   (`rm -rf .next && pnpm typecheck`). Verify with context7 → `@elysiajs/eden` (v1.4.9) docs on large-app typing.

3. **Localized cast (last resort):** cast `useElysia()` in `src/core/notion/client/hooks.ts`. Smallest
   diff, but **fragile** — the casualty domain can flip to microsoft/slack/recruitment on any future
   route change, so you'd be re-patching a moving target. Not recommended.

## Files

- `src/frontend/lib/eden.ts` — where the treaty client type is built (the lever for fix #2).
- `src/server/router.ts` — `AppRouter` composition (all `.use(...)` domain routers).
- `src/core/notion/client/hooks.ts`, `src/core/notion/client/ui/notion-integration-card.tsx` — current
  error sites (symptom, not cause).

## Also know: migrations (separate pre-existing issue — do NOT try to "fix" as part of this)

- `drizzle-kit generate` (`pnpm db:generate`) is **broken repo-wide on main**, independent of recruitment:
  snapshots `0005–0008` descend from a 0003-based slack/microsoft branch and omit `0004`'s doc-review
  columns → "pointing to a parent snapshot ... collision". This is the long-standing "tangled migration
  state". Fixing the snapshot chain is a **separate** task (the team owns it).
- Because `generate` is blocked, the recruitment migrations were **hand-authored**:
  `drizzle/0009_recruitment_node_types.sql` (enum `ADD VALUE person/vacancy`) and
  `drizzle/0010_recruitment_tables.sql` (vacancy/candidate/analysis). `pnpm db:migrate` applies them from
  `_journal.json` + SQL (no per-migration snapshot needed). They were **not** given meta snapshots on
  purpose — adding them on top of the broken chain would make the `generate` mess worse.
- If you later repair the `0005–0008` chain, regenerate `0009/0010` snapshots then too.

## Verify when done

```bash
rm -rf .next
pnpm typecheck        # target: 0 errors
pnpm test             # target: 237 passed
pnpm build            # target: succeeds
```

## Housekeeping left open

- Worktree `.claude/worktrees/worktree-recruitment` (branch `worktree-recruitment`) is now fully merged
  into `main` — safe to remove after you confirm build is green:
  `git worktree remove .claude/worktrees/worktree-recruitment && git branch -D worktree-recruitment`.
- Two other parallel worktrees exist and are unrelated to this handoff: `feat/person-profile`
  (pantalla 2) and `feat/onboarding-journey` (pantalla 6). Leave them.
- Uncommitted landing WIP on main (`footer.tsx`, `nav.tsx`, new `logo.tsx`) is unrelated — leave it.
