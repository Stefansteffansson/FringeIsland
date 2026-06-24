# Stand up the hub/ test harness (Jest + Playwright), green-on-empty

---
id: TASK-H001-01
title: Stand up the hub/ test harness (Jest + Playwright), green-on-empty
status: done
assigned_to: Claude (CC)
priority: high
feature: FEAT-H001
owner: hub
wave: ferd
depends_on: []
estimated_hours: 3
---

## Description

Stand up the `hub/` test harness so every later FEAT-H001 step lands on a runnable, tested base (kickoff "suggested first move" #1; STORY-3). Two suites, mirroring the `hub-legacy/` oracle's conventions (copy-with-correction, never import-and-patch):

- **Jest** — `unit` (jsdom) + `integration` (node, real Supabase via `.env.local`). Integration uses an anon client (RLS-enforced) for assertions and a service-role admin client for setup/teardown only.
- **Playwright** — `testDir tests/e2e`, `baseURL http://localhost:3000`, shared `storageState` at `tests/e2e/.auth/user.json`, a `global-setup` that creates the fixed E2E user and saves the logged-in storage state.

## Acceptance criteria

- [ ] `hub/jest.config.js` defines `unit` (jsdom) + `integration` (node) projects; module alias `^@/(.*)$ → <rootDir>/$1`.
- [ ] `hub/jest.setup.ts` wires `@testing-library/jest-dom`; integration setup loads `.env.local` via `dotenv`.
- [ ] `hub/tests/helpers/supabase.ts` provides `createTestClient()` (anon), `createAdminClient()` (service role), `createTestUser()`, `signInWithRetry()`, `cleanupTestUser()`, `cleanupTestGroup()` — copy-with-correction from the oracle.
- [ ] `hub/playwright.config.ts`: `tests/e2e`, serial (`workers: 1`), `baseURL` localhost:3000, `storageState` `tests/e2e/.auth/user.json`, `globalSetup`.
- [ ] `hub/tests/e2e/.auth/` is gitignored; `npm test` and `npx playwright test` run (green on an empty/placeholder spec).

## Technical notes

- Oracle refs: `hub-legacy/jest.config.js`, `hub-legacy/playwright.config.ts`, `hub-legacy/tests/e2e/global-setup.ts`, `hub-legacy/tests/helpers/supabase.ts`.
- E2E user (fixed, recreated each run): `e2e-session@fringeisland.test` / `e2e-test-password-123`.
- `handle_new_user()` trigger auto-creates the personal group; `createTestUser()` returns `personalGroupId`.

## Verification

- `cd hub && npm test` → both projects discovered, green.
- `cd hub && npx playwright test --list` → specs discovered; global-setup compiles.
