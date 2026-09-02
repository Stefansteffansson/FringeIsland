# The shared-identity revocation audit — 13 named specs, uncleared

---
id: TASK-E2E-03
title: Audit the remaining shared-identity revocation hazards spec-by-spec (successor to TASK-E2E-01's uncleared scope)
status: done  # 2026-09-02 — audited 15 revocation-verb specs by target identity; ONE hazard (account-state.spec) moved to a dedicated FIM; 17 out of class confirmed
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

- [x] Each of the revocation-verb specs verified **by identity of the revocation target**, one spec at a time, with a recorded per-spec verdict — **15 at HEAD (the class had grown), table below, 2026-09-02.**
- [x] `account-state.spec` adjudicated first, including the failure mode where a restore path does not run — **the one hazard; failure mode recorded below.**
- [x] Every spec found hazardous moved to a dedicated FIM — **`account-state.spec.ts`, 2026-09-02.**
- [x] The remaining shared-identity specs (sign-in without a revocation verb) confirmed out of class — **17, listed below.**
- [x] Closure states **the mechanism removed**, not the number of green fleets — **see the closing paragraph.**

## Technical notes

Precedent fixes: `hub/tests/e2e/profile.spec.ts` and `hub/tests/e2e/sessions.spec.ts` (both on dedicated FIMs as of 2026-08-05/06). Teardown must use the consented-fixture path — a bare delete refuses on `consent_records_subject_user_id_fkey` and supabase-js *returns* rather than throws, so a swallowed failure looks like success (see TASK-E2E-02, which also carries the `admin-roles.spec` bare-`.catch` audit lead).

## Verification

Per-spec verdicts recorded in this file; the closing entry names the mechanism removed for each spec that was changed.

---

## The audit — executed 2026-09-02 (Ferd leftovers pass), spec by spec, by identity of the target

**The class, measured at HEAD:** 46 specs. **27 ride the shared identity** (`e2e-session@fringeisland.test`, `helpers/auth.ts:3`, minted in `global-setup.ts:26`, fleet default via `playwright.config.ts` `use.storageState`): 24 on the default `page` fixture with no opt-out, plus 3 that sign in fresh as the same identity (`announcements-window-reports`, `lifecycle-and-export`, `realtime`). Five opt out at file level and sit outside the class (`auth`, `entry`, `onboarding-arrival`, `signup`, `transcendence`). The task's "23 / 13" of 2026-08-06 had grown to 27 / 15 with the acting family and the account specs.

**Revocation-verb verdicts (15 specs) — by identity of the revocation TARGET, with the line that proves it:**

| Spec | Verb | Target identity | Verdict |
|---|---|---|---|
| `account-state` | suspend `:56`, decommission `:71` | **`SESSION_EMAIL`** `:19` | **HAZARDOUS** — the flip is applied to the shared FIM by email; restore is best-effort |
| `account-suspension-journey` | suspend `:113`, sign-out click `:126` | `fims.subject` `:36` | harmless — dedicated FIM, fresh context `:97` |
| `account-lifecycle` | pause `:112`, delete account | `PAUSER_EMAIL` / `DEPARTER_EMAIL` `:30,:32` | harmless — spec-created FIMs; `browser.newContext()` inherits nothing |
| `admin-bulk-members` | bulk suspend `:172`, bulk force-logout `:211` | fixtures a/b `:88-89`, list bounded by stamp `:147` | harmless |
| `admin-members` | suspend `:176`, platform exit `:226`, revoke-admin `:243` | `sanc` / `exitFim` / `grantee` `:137-141` | harmless — addressed at fixture ids |
| `admin-groups` | suspend-group `:221` | `caretakerGroupId` `:202` | harmless — a group, not an identity |
| `admin-suspended-content` | suspend-group `:232`; `signOut()` `:207-208` | fixture group; `stew` / `memb` clients `:39-40` | harmless |
| `group-availability` | suspend-group `:209` | fixture `groupId` `:206` | harmless |
| `membership-lifecycle` | pause-member `:124` | `target.pgId` `:105` | harmless — file opts out `:61` |
| `profile` | UI sign out `:133` | `e2e-profile-<stamp>` `:24,:46` | harmless — the precedent fix (E2E-01) |
| `sessions` | revoke device `:122-124`, self sign-out `:183-186` | `SUBJECT_EMAIL` `:27,:73` | harmless — dedicated FIM |
| `wielded-announcements` / `-conversations` / `-forum` | `signOut()` `:71` / `:75` / `:70` | `STEWARD_EMAIL` fixture clients | harmless |
| `frozen-and-group-progress` | "revoke" `:276` | a progress-sharing toggle | harmless — revokes a share, not a session |

**The one hazard, and its exact failure mode (`account-state.spec.ts`):** it flipped the shared FIM's lifecycle columns by email and relied on `beforeEach` (`:30`) and `afterAll` (`:34`) to restore. Neither is guaranteed — `afterAll` is skipped on an aborted run, a worker crash, or `--max-failures`; `setLifecycle` rethrows on any REST error; and both compete for the 30 s hook budget that has already timed out three specs in this fleet. STORY-3 runs last, so the leaked condition was the **terminal** one: `is_active=false, is_decommissioned=true`. **The poison is state, not a token:** no session was revoked, `user.json` stayed valid, downstream riders authenticated fine and then painted `account-closed-surface` instead of the app and failed every real UI assertion. Thirteen specs self-heal in their own `beforeAll`; the eight admin specs, `groups`, `notification-preferences`, `group-availability` and the three wielded specs failed **as a block**; a solo re-run of `account-state` repaired it via `beforeEach` — which is why it presented as an intermittent bug somewhere else. (The docstring's "stays stable across reruns" overstated the guarantee: no serial mode, no failure path.)

**Fixed — the mechanism removed:** `account-state.spec.ts` now runs on a **dedicated spec-created FIM** (`e2e-account-state-<stamp>`), fresh context + UI sign-in per story, lifecycle flips on that identity only, torn down through `deleteE2EUserByAuthId` (throws if the personal group survives). It no longer imports `SESSION_EMAIL`; nothing in it can reach the shared session.

**Out of class, confirmed (17):** `admin-dashboard`, `admin-moderation`, `admin-roles`, `announcements-window-reports`, `consent`, `export`, `forum`, `groups`, `journal`, `journeys`, `lifecycle-and-export`, `messages`, `notification-preferences`, `player`, `player-completion-review`, `player-response-capture-review`, `realtime` — ordinary reads/writes; the admin specs' `setPlatformAdmin(false)` demotions are symmetric with their own `beforeAll` elevation and return the shared FIM to its global-setup baseline.

**Sign-out scope:** no spec signs the shared identity out in a browser; every in-app sign-out path is `scope: 'local'` (AuthContext, session-guard, farewell page). The spec-side `supabase.auth.signOut()` calls (three wielded specs, admin-suspended-content) use the default global scope but only ever on fixture clients.

**Closure states the mechanism, not a green count:** one hazardous spec, moved to a dedicated identity; fourteen harmless verdicts recorded by target; seventeen out of class. The ×2-consecutive-green bar is deliberately not the evidence.
