# Session bridge — 2026-09-02 (2): TASK-DBT-01 done — the test tier is type-clean, and CI keeps it so

**Continuation of `2026-09-02_01`** (DBT-03 done). Stefan: "let's do DBT-01 next." Fuller-auto: tests, one 3-line app-tier test affordance, scripts, CI, planning docs. No schema, no core, no steering files.

## Live state (verified this session — cite, don't re-derive)

- **TASK-DBT-01 is `done`**, both acceptance criteria. Disposition with the full shape-by-shape account: [`TASK-DBT-01`](../backlog/tasks/TASK-DBT-01-test-tier-type-debt.md).
- **`npm run typecheck` (root → hub `tsc --noEmit -p tsconfig.json`) exits 0 with 0 errors** over app + tests. Baseline on main this morning: **1 099 errors in 115 files**, all under `tests/`, zero in the app tier.
- **CI now runs Lint → Type-check (app + tests) → Unit → Build** (`.github/workflows/ci.yml`, reason in a comment). The gate decision the task asked for is taken: yes.
- Unit tier **179 suites, 1 518/1 518** (the same count as the 2026-08-21 bridge — no cell lost). The four type-touched integration suites **60/60**, teardown clean. Lint 0 errors.
- Memory updated: `next build` is no longer "the only type gate" — see [[feedback_next_build_is_the_type_gate]].

## What was built

1. **One line for 734 errors.** The suites import `expect` from `@jest/globals`, whose `Matchers` type jest-dom's default entry does not augment; `tests/setup.ts` now also imports `@testing-library/jest-dom/jest-globals`. Every `toBeInTheDocument`-class error was this.
2. **The remaining 365 across 65 files**, fixed by shape in five parallel sub-agent clusters by directory (api routes / components-groups / other components / app+lib / integration), each verified with a scoped tsc and its own unit run; the integration cluster was type-fix only and its suites were run here. Honesty rules held: no `any`, no `@ts-ignore`/`@ts-expect-error`, no assertion changed, no cell skipped, no app type widened. Shapes: Jest 29 → 30 mock generics; typed doubles in `jest.mock` factories; `as unknown as` for the mocked-`NextResponse` shape in 24 route suites; fixture drift completed with behaviour-preserving values; `PromiseLike` for supabase builders; typed `runAdminSql` rows.
3. **`resetTelemetrySink()`** in `lib/observability/telemetry.ts` — the only app-tier change; eight route suites wrote through a `readonly` array.
4. **The gate:** `typecheck` scripts at root and hub; CI step with its reason.

## Findings worth knowing

- **Real latent test bug:** `role-template-disposal.test.ts` passed an email as a bare string to `createTestUser`; the helper ignored it (ts-jest never checks). Fixed as `{ displayName }` on purpose — a *pinned* `pc029x…@` email would be invisible to the integration teardown's `test-%@` account sweep on an afterAll failure, the class DBT-03 just closed.
- Fixture drift told a small history: `MyPermissionsRead.member_group_id` (H017), `RoleEntry` provenance (H043), `RoleTemplateOption` adoption triple (PC028), `GroupSummary` PC023 keys, `NotificationRow.dispatch_segment` (COR-C W3), and one `intent: 'positive'` outside the registry vocabulary that the app had been degrading to neutral.
- Three pre-existing `onRespond={jest.fn() as never}` casts in `notification-actions.test.tsx` raise no error and were left alone (observed, not in the debt).

## Stated plainly (for Stefan's nod)

- **DoD wording — nodded and done the same day.** `feature-development` SKILL.md (Step 4.5, the Test DoD checklist, the Always-do boundary) and `AGENTS.md` (Always-do) now name `npm run typecheck` beside `npm run lint`. Rationale recorded in the skill line: CI gates both, but a fuller-auto merge can land before CI finishes, so the local run is the one that counts.
- **Lint warnings:** 4 (0 errors), **all in files this sweep did not touch** (`app/api/auth/farewell/route.ts` unused import; `internal-api-conformance.test.ts` two unused `eslint-disable no-console`; `api-boundary-hardening.test.ts` unused `runAdminSql`) — pre-existing, found not caused, left for a hygiene pass.

## The rest of the board

- **TASK-DBT-02** (COR-C E2E fallout, four specs) remains at its own priority — the last DBT item.
- The ADR-U039 topic-channel rider (recorded, unscheduled); DM message editing (open, unpulled); beppe.hopper reaps ~2026-09-14 by design.
