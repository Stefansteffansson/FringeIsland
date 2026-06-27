# Session bridge — FEAT-H004 (Hub half of IDN-2): Mist→FIM transcendence + the farewell, `6-done`

**Date:** 2026-06-27 (build session; follows `2026-06-27_02` which closed FEAT-PC002)
**Session type:** build (Hub product, TDD red-first) — the Hub half of IDN-2
**Status:** **FEAT-H004 built, fully green, and flipped `4-ready → 5-in-cycle → 6-done`.** All 3 tasks `done`. No migration (consumes the merged FEAT-PC002 substrate). Branch `idn-2-h004` — fuller-auto commit/PR/merge carried (routine: no schema, no core, no ADR, no deps).
**Participants:** Stefan + Claude

> Picks up `2026-06-27_02`. Since that bridge, PC002 (PRs #4–#6) merged to `main`, so the transcendence/reaper/consent + explicit-erase + FIM-account-erasure RPCs are live. This session built the Hub surface that consumes them.

---

## What was built (TDD red → green, demonstrated red first)

Three tasks, reusing the FEAT-H001/H002/H003 spine — no re-scaffold, **no migration**.

| Task | Stories | What |
|---|---|---|
| **H004-01** | S1, S2, S5 | In-place transcendence + consent gate. `lib/auth/transcendence.ts` (`finaliseTranscendence` → `finalise_transcendence` RPC) behind `POST /api/auth/transcend` (server consent gate + audit/telemetry + welcome-trigger seam); `AuthContext.transcend` (client `updateUser` anon→permanent **then** the route — convert-then-finalise); new `/become-a-fim` page (reuses FEAT-H002 fields + required consent, Mist-gated); `/mist` CTA `/signup`→`/become-a-fim`. |
| **H004-02** | S3, S4 | The farewell. New `ConfirmModal` design-system primitive (copy-with-correction from the `hub-legacy` oracle; named export + `data-testid` + `busy`); `lib/auth/farewell.ts` (`explicitEraseMist` → `explicit_erase_mist` RPC) behind `POST /api/auth/farewell`; `AuthContext.sayGoodbye` (route → `signOut` → sessionless); Mist-only "say goodbye" affordance on `/mist`. |
| **H004-03** | S1 (continuity), S4 | `tests/e2e/transcendence.spec.ts` (transcendence + consent-gate + farewell journeys); stale `entry.spec.ts` CTA assertion `/signup`→`/become-a-fim`; consent-aware E2E cleanup helper. |

**Test evidence:** 27 new Jest unit + 4 new integration + 3 new Playwright E2E, all red-first. **Full suite green: 54 unit + 31 integration + 15 E2E**; `npm run lint -w hub` + `npm run build -w hub` clean.

## Key design decisions

- **Conversion client-side (auth SDK), finalisation server-side (route → RPC).** The anon→permanent `updateUser` is the narrow auth exception (browser, as H001/H002/H003); the `finalise_transcendence` RPC is a data call, so it goes through `POST /api/auth/transcend` — never a browser `supabase.rpc()` (Hub CLAUDE.md narrow-exception rule / ADR-U009). Same split for the farewell.
- **Convert THEN finalise (spec order).** `AuthContext.transcend` gates consent → `updateUser` (preserves `auth.users.id`) → posts the route. On finalisation failure the error is surfaced and the flow does **not** navigate (`router.push('/groups')` only on success); the platform RPC is atomic, so the caller stays a domain-Mist (`is_temporary` still true) — proven at integration. Identity flips Mist→FIM via `onAuthStateChange` (`is_anonymous` flips), never queried in the listener.
- **Continuity is platform-side.** The Hub copies no rows — integration asserts the same `personal_group_id` after transcendence; E2E asserts the journey lands on `/groups` (empty-state, not a "new user" reset).
- **`ConfirmModal` built fresh.** The new `hub/` tree had no confirmation primitive; built it (the farewell is destructive — `ConfirmModal`, never `confirm()`).

## What is still open / not built (forward seams, by design)

- **Founding-questions assessment + the metamorphosis-completion gate (ball / Beyond unlock)** — out of scope (fundamentals before experience design); the completion gate wires to the assessment when built.
- **FIM self-service account-erasure** — the `erase_fim_account` RPC exists (admin/ops, service-role) but no Hub UX; named as a forward seam in FEAT-H004 (the future "delete my account" affordance would route through that privileged path).
- **Consent withdrawal / history / re-consent UI (IDN-6/7)** — substrate supports it (open purpose, append-only); only the transcendence consent gate is built.
- **PC-1 telemetry sink** — transcendence/farewell V4 events bind to the in-memory seam (the PC-1 sink stays routed to G-29, as H001/H002/H003).

## For the next session

- **Read order:** this bridge → FEAT-H004 (Implementation notes + Stories) → `lib/auth/transcendence.ts` + `app/api/auth/transcend/route.ts` → `lib/auth/farewell.ts` + the farewell route → `app/become-a-fim/page.tsx` + `app/mist/page.tsx` → the FEAT-PC002 migrations (`20260626205932` transcendence, `20260626202215` explicit-erase).
- **Orientation (tests, from repo root):** `npm test -w hub -- --selectProjects unit`; `npm test -w hub -- --selectProjects integration --runInBand`; `npm run test:e2e -w hub` (auto-starts the dev server via the Playwright `webServer` config).
- **Next Hub area:** Identity continues — session edges (IDN-11) and the rest of A-IDN (IDN-4..IDN-12), then GRP-4 group surfaces. A **doc-health-check** at the cycle boundary remains the formal sweep (verifies §L4 vs `features/`, cascade integrity, the inline-count discipline).
