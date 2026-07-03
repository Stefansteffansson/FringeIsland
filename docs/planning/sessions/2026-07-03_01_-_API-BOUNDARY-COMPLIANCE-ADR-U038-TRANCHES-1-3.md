# Session bridge — API-boundary compliance: audit → ADR-U038 → three tranches merged

**Date:** 2026-07-02 → 2026-07-03
**Session type:** Architecture compliance audit + correction + workflow root-cause (the user's A–E request).
**Status:** **Complete.** ADR-U038 ratified; tranches 1–3 merged to `main` (PRs #48, #49, #50; `main` @ `e3db334`). One tracked doc follow-up remains (feature-spec amendments — §Follow-ups).
**Participants:** Stefan + Claude

---

## What the session set out to do

Stefan's brief (A–E): (A) re-read the anatomy/API baseline, (B) deep-audit how the Hub v2 build complies with the platform API layers, (C) plan corrections for any non-compliance, (D) execute, (E) find *why* earlier build drifted and fix the workflow so it can't recur.

## What happened

**B — the audit** ([`../hub-v2/api-conformance-register.md`](../hub-v2/api-conformance-register.md)). The v2 frontend is genuinely API-first clean (zero direct table access; only the `supabase.auth.*` exception) — v1's ~165-site sin is not repeated. But taking Hub SPEC §5 + PC-3 §3/§7 seriously surfaced:
- **3 substrate security holes** reachable via direct PostgREST with the public anon key: **S1** a Mist could `UPDATE users SET is_temporary=false` on its own row (self-promote to FIM, bypassing consent-gated `finalise_transcendence`); **S2** `users_select_active` exposed every active member's `email` to any authenticated session; **S3** sign-up consent was gated only in the Hub route and never durably recorded.
- **2 mislocated contracts**: **F1** the FEAT-PC003 profile gating/validation lived in `hub/lib`; **F2** the groups read-model was a 4-step TS composition — neither inheritable by the Gimbal.
- **The parked API-location question** (bridge `2026-07-01_03`): were the Hub-hosted routes a private BFF or a shadow Platform API?

**ADR — [ADR-U038](../../architecture/decisions/ADR-U038-platform-contracts-platform-side-surface-bff.md)** (Option A, Stefan-approved). Platform contracts live platform-side (PostgREST RPC / RLS / trigger / grant); Surface `app/api/*` routes are **private BFF plumbing** and never the sole home of a rule. Resolves the versioning/Bearer "directional" deviations by scoping ADR-U015 to the platform surface, not BFF plumbing. Reaffirms PostgREST-RPC-canonical (PC-3 §3/§7). Carries ADR-U035/U036/U037 forward.

**D — execution, three tranches (all merged):**
- **Tranche 1 (PR #48, `04cd6d3`)** — substrate enforcement. Column privileges on `public.users` (UPDATE limited to the 6 identity-scope columns; SELECT revokes `email` from client roles); `handle_new_user` now gates credentialed FIM creation on consent + writes a durable `transcendence` consent row (Mists exempt). Migrations `20260702120000` / `20260702120100`.
- **Tranche 2 (PR #49, `590b5c6`)** — contract relocation. `get_own_profile()` + `update_own_profile(jsonb)` (F1) and `get_member_groups()` (F2) RPCs; Hub lib repointed to them; `validateProfilePatch` kept as client-side UX pre-check only. Migrations `20260702130000` / `20260702130100`.
- **Tranche 3 (PR #50, `e3db334`)** — workflow fix (E). Gate patches GP1–GP5: rewrote the root-cause rule (Hub `CLAUDE.md` L23); API-boundary DoD row in `feature-development`; direct-caller question in the platform schema-review rule; PROCESS §9.2 "a code comment is not a filed deviation" + new doc-health **Section 1.6** (greps for `directional`/`not yet realised` markers); PC-3 §7 stale route inventory → pointer. The four route "directional" comments now cite ADR-U038.

**E — root cause** ([`../retrospectives/2026-07-02-api-boundary-compliance-retro.md`](../retrospectives/2026-07-02-api-boundary-compliance-retro.md)). The drift survived five feature DoDs because the steering file the builders read (Hub `CLAUDE.md` L23) encoded a mis-reading of ADR-U009 ("business logic lives in `app/api` route handlers … so iOS and Android inherit them" — impossible), the ownership rule (PC-3 §3/§7) sat outside the product build path, deviations were captured as code comments but never triaged, and no gate checked API-boundary placement or dared the adversarial direct-caller test. GP1 fixes the source; GP2–GP4 add the gates; GP5 stops the spec snapshot re-staling.

## Things the process caught along the way (worth remembering)

- The **regression sweep caught a real `signUpFim` regression** — the S3 gate was added to the migration + test helpers but not to `signUpFim` itself, so live signup would have broken. Caught because tranche 1's sweep ran auth/account/groups, not just the security suite.
- **`profile-bio-constraint.test.ts` had been red on `main` since #48** — a bare `.update().select()` (SELECT *) 42501s once `email` SELECT is revoked. Missed in the tranche-1 sweep (profile suite wasn't run); fixed in tranche 2.
- **An untracked, incomplete `platform-enforcement.test.ts` fragment** appeared (not authored by Claude); surfaced to Stefan rather than deleted blind, then removed once confirmed the S1–S3 coverage lived in `api-boundary-hardening.test.ts`.
- **"Merged" ≠ merged, twice:** migrations reported "applied" weren't on the DB (verified via MCP); PR #50 reported "merged" was still OPEN (verified via `gh`). Both caught by checking actual state before proceeding.

## Verification (final)

7/7 security tests; 25/25 profile+groups+security; 60/60 auth+account; `next build` clean. All migrations applied to the live pre-launch DB and logged. Direct-caller RPC tests prove server-side enforcement (e.g. `update_own_profile({is_temporary:true})` → `22023`).

## Close ritual (2026-07-03)

- Dashboard refreshed (588 files).
- **doc-health-check** (scoped to session changes): §1.6 clean (0 markers), §9 clean (load-order intact, edits level-appropriate), **§2 finding** → the follow-up below. Sections 1/1.5/3–8/10 not triggered.
- This bridge written.

## Follow-ups (tracked, non-blocking)

- **Feature-spec amendments (doc-health §2 finding; register §5 tranche-3 item 7).** FEAT-PC003, FEAT-H002, FEAT-H001 (groups read), FEAT-H005 are `6-done` and now lag the code: the profile/groups contracts moved to RPCs and the sign-up consent gate moved into `handle_new_user`. Each needs a short provenance amendment pointing at ADR-U038 + the register. Deferred to a focused reconciliation pass (skill rule: multi-spec 6-done amendments are backlog, not rushed inline) — batch at the next cooldown. Most misleading if left: FEAT-H002's consent "No-go" (now closed at the substrate) and FEAT-PC003's "direct `.from('users')`" description (now an RPC).
- **Cycle D (IDN-5 Journal)** remains the next *feature* cycle (carried from `2026-07-01_03`).
- **Perf backlog** T2 (RSC server-render) unchanged.

**Final state:** `main` @ `e3db334`, PRs #36–#50 merged, tree clean.
