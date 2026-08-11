# ADR-U032: Hub v2 rebuild — coexistence via a separate clean tree (`hub/`, old → `hub-legacy/`)

**Status:** Accepted
**Date:** 2026-06-24
**Deciders:** Stefan + Claude
**Tags:** scope:product · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

[ADR-U030](./ADR-U030-hub-v2-greenfield-rebuild.md) decided the Hub would be rebuilt greenfield, but left one thing unspecified: **where the new code physically lives, and how it coexists with the old Hub MVP during the build.** The old Hub was the entire root `app/` + `components/` + `lib/`, and the plan requires it to stay a usable **oracle** (read-only, copy-with-correction) through Phases 2–3, then be retired at Phase-4 cutover.

*How should the new codebase be located so the old Hub stays intact as the oracle, while the new Hub is built clean and API-first from line one, with a clean Phase-4 cutover — and without baking a version number into a directory name?*

## Decision drivers

- **Oracle integrity** — the old Hub must stay readable (and runnable for reference) through Phases 2–3; *copy-with-correction, never import-and-patch* (plan rule).
- **Clean from line one** — the new Hub must not inherit the old app's config, providers, `proxy`/`middleware`, or `lib` entanglements; API-first (ADR-U009) with no direct DB calls.
- **Every slice ships runnable and tested** — the new Hub must stand up independently (walking-skeleton rule).
- **Shared substrate** — both surfaces talk to the same Supabase DB / `supabase/migrations/` (the carried-forward asset, per the substrate audit).
- **Clean cutover** — Phase 4 must retire the old Hub mechanically, not via a big-bang path rewrite.
- **No version in directory names** — directory names must name a *permanent artifact* (a surface), never a transient rebuild iteration, or the repo accretes `hub-v2/`, `hub-v3/`, … forever.
- **Pre-launch / no users** (ADR-U030) — no live-migration risk; we are free to restructure.

## Considered options

- **Option A** — Separate clean tree: the new Hub grows in its own directory (`hub/`) as its own app; the old Hub is relocated to `hub-legacy/`.
- **Option B** — In-place, area-by-area replacement inside the existing root `app/` + `components/` + `lib/`.
- **Option C** — One app, route-group split: old and new routes coexist under a single `app/`, sharing config/providers.

## Decision outcome

**Chosen option: A — separate clean tree**, because it keeps the old Hub intact as the oracle while letting the new Hub be clean and API-first from line one, at the lowest entanglement and with a mechanical Phase-4 cutover.

**Specifics:**
- **The new Hub lives under `hub/`** at the repo root — a self-contained app (its own `app/`, `components/`, `lib/`, `tests/`, `proxy.ts`, config). `hub/` is the Hub's **permanent** home; it carries no version number.
- **The old Hub is relocated to `hub-legacy/`** (done 2026-06-24 via `git mv`, history preserved) — the frozen oracle: read-only, copy-with-correction, **deleted at Phase-4 cutover**.
- **Shared and root-level:** `supabase/migrations/` (one DB, the carried-forward substrate), the `docs/` tree, and repo tooling (`scripts/`, the dashboard) stay at root.
- **The repo becomes a monorepo of surfaces.** Sibling surfaces join as their own top-level trees: `hub/`, later `gimbal/`, then studio surfaces — peers over the shared backend.
- **Phase-4 cutover:** delete `hub-legacy/`; `hub/` is simply the Hub (a peer to the future `gimbal/`). No "promote to root" churn.

### The naming principle (why not `hub-v2/`)

A code directory names a **permanent artifact** — the *surface* — so it is named `hub/`, forever. **"v2" names the *rebuild project*, not the artifact**; it lives in `docs/planning/hub-v2/` (a time-bounded planning folder) and in git history, never in a code path. A future rebuild builds into the *same* `hub/` (on a branch), and the retired snapshot lives in a git tag/branch — or briefly as `hub-legacy/` during a cutover window. The repo therefore **never accumulates `hub-v3/`, `hub-v4/`**.

### Execution status / deferred work

**FULLY EXECUTED 2026-08-11 at the Phase-4 cutover.** This section records status only; the decision above is unchanged.

- **Directory relocation** — done 2026-06-24.
- **`hub-legacy/` deleted** — done 2026-08-11 (W2, PR #502): 178 files, ~40 100 lines. Gated on the [oracle discharge check](../../planning/hub-v2/2026-08-11-oracle-discharge-note.md) (all ten coverage-map rows exhausted, **zero UNACCOUNTED findings**), not on the calendar. **Retrievable at the annotated tag `hub-legacy-final`** (`git show hub-legacy-final:hub-legacy/<path>`) — this ADR's "read-only oracle, then retired" arc is complete, and the tag is now the referent of the copy-with-correction provenance comments left in `hub/` and in two migrations.
- **The per-app `package.json` split** — done 2026-08-11 (W3, PR #503). Root is **tooling-only**: zero dependencies, four dev dependencies. **Correction to this section's own earlier estimate:** it named `gray-matter` + `marked`; a sweep of every root-owned `require` showed the true keep-set is **four** — `@supabase/supabase-js` and `dotenv` are required by the maintenance scripts. Three dependencies had **no consumer anywhere** and were dropped (`better-sqlite3`, `cross-fetch`, `whatwg-fetch`). `hub/` already declared every app dependency at identical versions, so resolution did not change.
- **Deploy posture, verified rather than assumed:** production already served `hub/` before the cutover, so Phase 4 was retirement and hygiene, not a deploy event. Evidence: dynamic routes return `x-vercel-id: arn1::dub1::…` (edge Stockholm, **function Dublin**), which is only possible if Vercel's root directory is `hub/` and `hub/vercel.json`'s region pin is being read.

### Consequences

- **Positive:** the oracle stays intact; the new Hub is clean from line one with no import-and-patch; slices ship and test independently; the cutover is mechanical; no version numbers in code paths; the monorepo-of-surfaces shape is established for the Gimbal and studios.
- **Negative:** two app trees and (after the split) two build configs during the window; some duplicate scaffolding; care needed that shared types stay in sync against the one DB; a one-time relocation churned ~180 files (history preserved).
- **Neutral:** the repo root no longer holds Hub source. The Hub `CLAUDE.md` "root `app/` = Hub code" note is corrected to: **`hub/` = the new Hub; `hub-legacy/` = the oracle.** (A `hub/`-local `CLAUDE.md` may follow if divergence warrants.)

## Pros and cons of each option

### Option A — separate clean tree (chosen)
- Pros: oracle stays intact; zero config/provider inheritance; clean API-first start; independent per-slice runnability; mechanical cutover; no version in directory names; sets up the surfaces monorepo.
- Cons: two app trees during the window; duplicated scaffolding; a one-time relocation.

### Option B — in-place, area-by-area
- Pros: no restructure; ends exactly where Phase 4 wants (the new Hub *is* the root app).
- Cons: the old Hub stops being a *runnable* app the moment shared files (`layout`, auth, `lib/supabase`) are overwritten — the oracle degrades to a git-history reference; high import-and-patch creep risk (the thing the plan forbids).

### Option C — one app, route-group split
- Pros: single app; shared tooling; gradual.
- Cons: new and old share config/providers/`proxy`/auth — entanglement makes "clean from line one" hard to guarantee; messiest separation; the cutover must still disentangle shared config.

## Links

- Related ADRs: [ADR-U030](./ADR-U030-hub-v2-greenfield-rebuild.md) (greenfield rebuild — this ADR fills its unspecified code-location question), [ADR-U009](./ADR-U009-api-first-frontend-agnostic.md) (API-first), [ADR-U025](./ADR-U025-products-as-equipment-profiles.md) (equipment profiles; the surfaces that become sibling trees).
- Related plan: [`docs/planning/hub-v2/README.md`](../../planning/hub-v2/README.md) (Phase 2), [`docs/planning/hub-v2/phase-2-kickoff.md`](../../planning/hub-v2/phase-2-kickoff.md).
- Related feature specs: [FEAT-H001](../../products/hub/features/FEAT-H001-walking-skeleton-sign-in-and-groups.md) (the first slice built against this decision).
- Entity rules updated: [`docs/products/hub/CLAUDE.md`](../../products/hub/CLAUDE.md) (the "root `app/` = Hub code" note → `hub/` + `hub-legacy/`).
