# Test-tier type debt — `tsc --noEmit` fails across test files

---
id: TASK-DBT-01
title: Test-tier type debt — ~1,300 lines of tsc errors in hub/tests (latent; ts-jest does not type-check, next build excludes tests)
status: done
assigned_to: claude (2026-09-02)
priority: low
feature: none  # hygiene sweep
owner: products/hub
wave: ferd
cycle: none — pulled 2026-09-02 straight after TASK-DBT-03
depends_on: []
estimated_hours: 6
---

## Description

Found during COR-C W3 (2026-07-31) when running `tsc --noEmit` over the whole
Hub: the TEST tier carries ~1,287 lines of type errors that no gate has ever
seen — `ts-jest` does not full-type-check (the PC003 lesson memory), and
`next build` (the type gate) excludes `tests/`. The app tier is clean.

Dominant shapes: NextResponse/Response mock typing in BFF route tests
(`group-leadership-routes.test.ts`, 39), loose fetch-mock bodies in
`GroupForumSection` suites (30+30), supabase-js `PostgrestFilterBuilder`
vs `Promise` shapes in `lifecycle-dispositions.test.ts`. The
`consent-read.test.ts` slice (14 errors, an over-narrow generic) was fixed at
COR-C W8 as the demonstrator.

## Acceptance criteria

- [x] `npx tsc --noEmit` clean over the whole hub workspace (app + tests)
- [x] A CI/gate decision: does `tsc --noEmit` join the DoD sweep so the debt
      cannot silently regrow? (Cheap once clean; decide at the sweep.) —
      **Decided YES, 2026-09-02:** `npm run typecheck` (root → hub
      `tsc --noEmit -p tsconfig.json`) is a CI step between Lint and Unit tests.

## Verification

`npx tsc --noEmit` exit 0; the gate decision recorded in the cycle notes.

---

## Disposition — done 2026-09-02 (fuller-auto; one 3-line app-tier addition)

**Baseline on main:** 1 099 errors in 115 files, all under `tests/`, zero in the app tier. Sampled by shape before touching anything.

**One line fixed 734 of them.** The suites import `expect` from `@jest/globals`, whose `Matchers` type is not the global one `@testing-library/jest-dom`'s default entry augments — so every `toBeInTheDocument` / `toHaveTextContent` / `toHaveAttribute` was a type error tsc could see and ts-jest never did. `tests/setup.ts` now also imports `@testing-library/jest-dom/jest-globals` (both register the same matchers at runtime). 1 099 → 365.

**The remaining 365, by shape, fixed honestly across 65 files** (five parallel sub-agent clusters by directory, each verified with a scoped tsc and its own unit run; no `any`, no `@ts-ignore`/`@ts-expect-error`, no assertion changed, no cell skipped, no app type widened):
- Jest-29 two-argument mock generics (`jest.fn<R, [A]>`, `jest.Mock<R, A>`) → Jest 30's one function type.
- Untyped `jest.fn()` doubles in `jest.mock` factories (`mockResolvedValue` parameter `never`; `toHaveBeenCalledWith` "expected 0 arguments") → typed with the real function via `import type`, factory wrappers taking `Parameters<typeof fn>`.
- The mocked-`NextResponse` casts in 24 BFF route suites (those suites mock `next/server` to return `{ status, body }`) → `as unknown as` the local shape; local `RouteResponse` types kept.
- `beforeEach(() => jest.useFakeTimers())` arrows returning `Jest` → block bodies.
- Fixture drift (fields real types gained: `MyPermissionsRead.member_group_id`, `RoleEntry` provenance pair, `RoleTemplateOption` adoption triple, `GroupSummary` PC023 keys, `Member.email/user_id`, `NotificationRow.dispatch_segment`) → completed with values that keep every cell's behaviour; one `intent: 'positive'` outside the registry vocabulary → `'primary'`.
- Supabase builders annotated as `Promise` → `PromiseLike` (lifecycle-dispositions); untyped `runAdminSql` rows → typed at the read site.
- `getTelemetrySink().length = 0` in 8 route suites (writing through a `readonly` array) → a new `resetTelemetrySink()` affordance in `lib/observability/telemetry.ts` — **the only app-tier change**, 3 lines, test support beside the existing `getTelemetrySink()`.
- Three dead `kind:` keys on `ActionableFields` literals removed (the chip never reads `kind`); the type was not widened.

**Real latent bug found (test-side):** `role-template-disposal.test.ts` passed an email as a bare string to `createTestUser`, which the helper ignored — the admin was always created with a generated address. Fixed as `createTestUser({ displayName })`, deliberately **not** a pinned email: the integration teardown sweeps accounts by `test-%@fringeisland.test`, so a pinned `pc029x…@` address would have been invisible to it on an afterAll failure (the DBT-03 class).

**Evidence:** `npm run typecheck` exit 0, 0 errors (the wiring itself verified); unit tier full — see the session bridge for the count; the four type-touched integration suites (lifecycle-dispositions, actionable-notifications, role-template-disposal, invitation-bell-actions) **60/60**, teardown clean; lint clean. No red-first claim: the task's own red is `tsc` exit 2 → exit 0.

**Gate decision:** YES. `typecheck` scripts at root and hub; `.github/workflows/ci.yml` runs it between Lint and Unit tests with the reason in a comment. The DoD wording in `feature-development` / `AGENTS.md` already says "lint and type-check"; naming `npm run typecheck` there is a steering-file edit left for Stefan's nod (bridge).
