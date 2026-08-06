# Fix the profile.spec shared-session flake (the standing watch item, root-caused at C-C)

---
id: TASK-E2E-01
title: profile.spec STORY-4 intermittent failure — shared-storageState session revoked by scope-global sign-outs; move the spec to fresh logins
status: done
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

**Executed 2026-08-05 (the N-E close boundary — the 4th occurrence forced it):** the recurrence had degraded from intermittent to **deterministic** (red even solo, red in the full sweep), and was control-proven found-not-caused against the N-E diff (still red with all four N-E surface files reverted to pre-cycle code). Fixed per this task's own spec.

## Acceptance criteria
- [x] `profile.spec` runs on its own dedicated FIM — fresh context + UI sign-in per story, never the shared storageState; STORY-2/3's shared-user mutation obligation dissolved with it (the subject is spec-owned) *(3/3 green immediately, incl. the 4x-red STORY-4 — the sign-out under test now acts on a provably live session)*
- [x] ~~Audit done: `profile.spec` STORY-4 was the fleet's ONLY scope-global sign-out on the shared state~~ **← FALSIFIED the same day; see the REOPENED section below (sessions.spec revoked the shared *identity's* sessions from its own contexts)**. Original text kept for the record: every other sign-out-mentioning spec manages its own contexts — every other sign-out-mentioning spec manages its own contexts (`sessions`, `account-suspension-journey`, `admin-suspended-content`, `announcements-window-reports`, `lifecycle-and-export`) and `account-state.spec` only asserts the button's visibility, never clicks it. With the one poisoner moved off, `entry.spec`'s recorded same-family flake loses its mechanism
- [x] Full fleet green **x2 consecutive** (133/133 + 133/133, 2026-08-05, leak 0→0 both) with zero profile failures; the flake-watch entry retired in the `2026-08-05_03` bridge

## Technical notes
Precedents: `hub/tests/e2e/sessions.spec.ts` (fresh sessions, the FEAT-H012 suite-order find) and `realtime.spec.ts` (the C-C fix — fresh logins for both contexts). Consider whether global-setup should re-establish the shared storageState session per run as belt-and-braces.

## Verification
Fleet runs (full, then profile-in-trio orderings) green with no profile flake across three consecutive runs.

---

## REOPENED then re-closed 2026-08-05 — the retirement claim was premature (second mechanism)

**The correction:** this task was marked `done` and the flake-watch "retired" earlier the same day on the strength of the profile.spec fix plus **two consecutive green fleets**. The third fleet falsified it: `signup.spec` red, six specs unrun, `sessions.spec` red — the same shared-session signature, in a spec my AC-2 audit had explicitly cleared.

**Why the audit missed it — the discriminator was wrong.** I classified specs by *"does it create its own browser contexts"* (sessions.spec does — four of them) and concluded profile.spec was the fleet's only hazard. But the poison is at the **identity** layer, not the browser-context layer: `sessions.spec` signed into the **shared `SESSION_EMAIL` user** in fresh contexts and then revoked `nonCurrentRows.first()` — a non-current session *of that shared identity*. When the shared storageState session sorted first, it was server-revoked and every later spec inherited a dead session. The suite's own docstring promised "the shared storageState session is never revoked"; `.first()` made that a hope, not a guarantee — and two green fleets were ordering luck, not proof.

**The rule this yields (worth carrying into the next audit of this class):** a spec is hazardous when it *revokes, signs out, suspends, or deletes sessions belonging to the shared identity* — regardless of how many contexts it opens. Fresh context ≠ fresh identity.

**Fix applied (same pattern as profile.spec):** `sessions.spec` now runs entirely on its **own dedicated FIM** (created in `beforeAll`, torn down via the consented-fixture pattern), so every session it lists, revokes, or signs out belongs to nobody else. 4/4 green; fleet re-run after the fix.

**Re-closing discipline:** the earlier "×2 green fleets" bar is explicitly **insufficient** for this family — ordering luck can produce it. Any future re-closure states the *mechanism* removed, not just green runs.

**Remaining audit scope (named, NOT cleared — the lesson applied to itself):** 23 specs sign in as the shared `SESSION_EMAIL`; 13 of those also contain a revocation-class verb (revoke / sign out / suspend / hard-delete). Most target *fixture* members and are harmless, but that has **not** been verified spec-by-spec, and a grep-level classification is exactly what produced the false all-clear above. `account-state.spec` is the named next suspect: it flips the **shared user's own** lifecycle state (suspend / decommission) and relies on `beforeEach`/`afterAll` restoration — safe only while every restore path runs. Whoever next touches this family: verify by *identity of the revocation target*, one spec at a time, and record each verdict.
