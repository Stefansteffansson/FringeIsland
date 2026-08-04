# Fix the profile.spec shared-session flake (the standing watch item, root-caused at C-C)

---
id: TASK-E2E-01
title: profile.spec STORY-4 intermittent failure — shared-storageState session revoked by scope-global sign-outs; move the spec to fresh logins
status: todo
assigned_to: claude
priority: medium
feature: FEAT-H005
owner: hub
wave: ferd
cycle: unscheduled
depends_on: []
estimated_hours: 2
---

## Description
The standing E2E flake-watch item (first fenced at C-B, bridge `2026-07-20_02`; fenced again found-not-caused at C-C, bridge `_04`) is now root-caused: `profile.spec` STORY-4's sign-out is **scope-global** — it server-revokes the shared `SESSION_EMAIL` storageState session. Any spec (or run) that later rides that shared session inherits a dead session: a `/auth/v1/logout` 403s `session_not_found`, `@supabase/ssr` leaves the cookie, and the next protected-surface navigation doesn't gate → the `toHaveURL` assertion fails. Intermittent by ordering, not by product behaviour. **Proven realtime-independent at C-C** (identical failure with the FEAT-H027 tenants disabled; two consecutive fresh isolated runs 3/3 green).

**Recurrence observed 2026-08-04 (ADM-G close, full-sweep run 1):** the family widened — `entry.spec.ts:46` (the become-a-FIM CTA, FEAT-H004) failed in the full sweep (131/132) and passed 3/3 in the immediate isolated control; a spec untouched since June, no causal path from the ADM-G diff (admin plane + communication doors), fenced found-not-caused in the `2026-08-04_06` bridge. Third distinct spec showing the shared-session signature — the scheduled fix's audit step (AC 2) should sweep entry.spec's session posture too.

**Recurrence observed 2026-08-03 (HYG-A close, full-sweep run 2):** STORY-4 failed in the full sweep (110/111) and passed 3/3 in the immediate isolated control — the recorded signature exactly. Same session also proved the trap class generalises: the new FEAT-H038 account-suspension journey's first draft rode the shared storageState into its wall-exit sign-out and took 20 downstream specs' mutations to 401 (fixed with a dedicated subject FIM in a fresh context — the same shape this task's fix needs). The watch condition ("recurrence before scheduling") is now met; next boundary should schedule the 2 h fix rather than carry a third time (PROCESS §3: bet, re-scope, or drop).

## Acceptance criteria
- [ ] `profile.spec` runs on its own fresh authenticated session(s) (the `sessions.spec` / `realtime.spec` mechanics), never the shared storageState — its sign-out can no longer poison later consumers
- [ ] Audit the remaining shared-storageState consumers for the same hazard (which specs sign out scope-globally; which later specs ride the shared session); fix or document each
- [ ] Full fleet green x2 consecutive with zero profile failures; the flake-watch entry retired in the next bridge

## Technical notes
Precedents: `hub/tests/e2e/sessions.spec.ts` (fresh sessions, the FEAT-H012 suite-order find) and `realtime.spec.ts` (the C-C fix — fresh logins for both contexts). Consider whether global-setup should re-establish the shared storageState session per run as belt-and-braces.

## Verification
Fleet runs (full, then profile-in-trio orderings) green with no profile flake across three consecutive runs.
