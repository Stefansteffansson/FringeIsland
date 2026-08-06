# The shared-identity revocation audit — 13 named specs, uncleared

---
id: TASK-E2E-03
title: Audit the remaining shared-identity revocation hazards spec-by-spec (successor to TASK-E2E-01's uncleared scope)
status: todo
assigned_to: unassigned
priority: medium
feature: none
owner: hub
wave: ferd
cycle: unscheduled
depends_on: []
estimated_hours: 3
---

## Description

**Successor to TASK-E2E-01** (swept at the 2026-08-06 boundary retro). E2E-01 fixed two specs — `profile.spec` and `sessions.spec` — that poisoned the shared E2E session by acting on the shared identity's sessions. It closed with its **remaining audit scope explicitly uncleared**, and that scope is this task. E2E-01 is deleted; nothing below may be inferred from it, so the full text is carried here.

**The class:** a spec is hazardous when it *revokes, signs out, suspends, or deletes sessions belonging to the shared `SESSION_EMAIL` identity* — **regardless of how many browser contexts it opens**. Fresh context ≠ fresh identity.

**Why this task exists rather than a green fleet:** E2E-01's first closure was declared on the strength of a fix plus **two consecutive green fleets**, and the third fleet falsified it (`signup.spec` red, six specs unrun, `sessions.spec` red — in a spec the audit had explicitly cleared). The audit missed it because it discriminated on *browser context* instead of *identity*. A grep-level classification is exactly what produced the false all-clear.

**Named scope, as recorded at the correction (2026-08-06):**

- **23 specs** sign in as the shared `SESSION_EMAIL`.
- **13 of those** also contain a revocation-class verb (revoke / sign out / suspend / hard-delete).
- Most target *fixture* members and are harmless — but that has **not** been verified spec-by-spec.
- **`account-state.spec` is the named next suspect:** it flips the **shared user's own** lifecycle state (suspend / decommission) and relies on `beforeEach` / `afterAll` restoration — safe only while every restore path runs.

## Acceptance criteria

- [ ] Each of the 13 revocation-verb specs verified **by identity of the revocation target**, one spec at a time, with a recorded per-spec verdict (hazardous / harmless-and-why). No grep-level all-clears.
- [ ] `account-state.spec` adjudicated first, including the failure mode where a restore path does not run.
- [ ] Every spec found hazardous moved to a dedicated FIM (the `profile.spec` / `sessions.spec` pattern: fixture created in `beforeAll`, torn down via the consented-fixture path).
- [ ] The remaining 10 shared-identity specs (sign-in without a revocation verb) confirmed out of class, or pulled in with a reason.
- [ ] Closure states **the mechanism removed**, not the number of green fleets — the ×2-consecutive-green bar is explicitly insufficient for this family (ordering luck produces it).

## Technical notes

Precedent fixes: `hub/tests/e2e/profile.spec.ts` and `hub/tests/e2e/sessions.spec.ts` (both on dedicated FIMs as of 2026-08-05/06). Teardown must use the consented-fixture path — a bare delete refuses on `consent_records_subject_user_id_fkey` and supabase-js *returns* rather than throws, so a swallowed failure looks like success (see TASK-E2E-02, which also carries the `admin-roles.spec` bare-`.catch` audit lead).

## Verification

Per-spec verdicts recorded in this file; the closing entry names the mechanism removed for each spec that was changed.
