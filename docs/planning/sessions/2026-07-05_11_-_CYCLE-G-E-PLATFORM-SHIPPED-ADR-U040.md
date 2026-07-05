# Session bridge — Cycle G-E platform shipped, ADR-U040 ratified, invite bug fixed; H017 teed up

**Date:** 2026-07-05
**Session type:** Build session (`feature-development`) — followed the G-E decompose bridge (`2026-07-04_10`). Shipped the G-E platform half, ratified a fundamentals ADR, fixed a live bug, and teed up the G-E Surface half. Closed for a reboot.
**Status:** All work committed and merged to `main`. Nothing dangling. FEAT-H017 at `5-in-cycle` with tasks written — the next session builds it.
**Participants:** Claude (autonomous build) + Stefan (nods on PC014 schema gate #80, ADR-U040 ratification #82, and the invite-fix schema gate #83; two design decisions taken — see below).

---

## What shipped (all merged to `main`)

1. **FEAT-PC014 — Cycle G-E platform half, `6-done`** (PRs #80 build + #81 paperwork). Leadership transfer, closure, deletion contracts over the existing PC-3 substrate; **no new table, no trigger changes**. Migration `20260705072252`.
   - `nominate_steward` **replaced in place** (template-aware + active-membership Steward resolution — closed the v2-named-Steward `'Member'`-class bug and the paused-Steward blind spot); `respond_to_stewardship_nomination` (accept / decline→next / decline→DeusEx fallback, ADR-U019) + the internal `_transfer_stewardship_to_deusex` helper; `hand_stewardship_to_deusex`; `close_group` (MEM-8, last-active-member → `status='closed'`); `delete_group` (GRP-9, soft-terminal → `status='archived'`).
   - **Security closure (ADR-U038):** the live sprint3 hole closed — `handle_notification_action` + `_handle_stewardship_nomination_action` **dropped** (they carried anon/PUBLIC execute and dispatched on caller-supplied `action_data`; the crafted-`action_data` exploit was demonstrated red — an outsider granted themselves Steward before the drop); the raw `groups_delete` RLS policy **dropped**; anon execute revoked across the surface.
   - **All five Open Qs ratified as implemented** (Q5 load-bearing: soft-terminal `archived`, not hard-delete — the `journeys … ON DELETE RESTRICT` wall makes hard-delete impossible for journey-owning groups anyway). **Four build findings nodded** — see Findings below.
   - Evidence: 48 new integration tests (39 red-first), groups domain 153/153, full integration 258/258.

2. **ADR-U040 — off-platform invitation is referral-to-the-platform, never a pre-committed group membership** (`Accepted`, PR #82). Raised by Stefan while reviewing the invite bug: "invite by email" models a *group membership for someone who hasn't transcended from Mist and hasn't consented* — inverting the consent-before-membership ordering (ADR-U031 grounded: FIM-only-by-status §Lifecycle-2; transcendence = the consent gate). **Chosen: Option C** — a FIM-shared invite **link/code** carrying a group destination; the recipient arrives, transcends + consents, and *only then* gets a pending group invitation to accept. Retires `invite_by_email`; keeps name-based FIM invite; no platform-sent email to strangers. **CQ-017** resolved. Downstream-unsettled (named in the ADR): referral-token mechanics, whether the platform ever dispatches email (V3 seam), group-to-group invites (G-F). **The MEM-2 rebuild is downstream decomposition work — not yet scoped.**

3. **Invite duplicate-message fix — FEAT-PC012 post-6-done, `6-done`** (PR #83). Reported live: inviting someone who already had a membership row leaked the raw Postgres `duplicate key value violates unique constraint …` to the UI. Root cause: `invite_member` (and `invite_by_email`'s FIM-conversion branch) did a bare INSERT and let the constraint throw; the BFF forwards the contract message through. Fix: pre-check → human, state-specific message (already a member / pending invitation / paused) under the **same `23505`** (no route/test-contract change), + a `unique_violation` backstop for races. Migration `20260705090321` (two function bodies; no schema change). Red-first `STORY-2b` block (4 message-level asserts). Groups domain 157/157. Fixed `invite_by_email`'s branch too (still live pending the ADR-U040 rebuild; the report came through it).

## Findings worth carrying

1. **Spec-premise correction (PC014, in the migration comment + notes):** the last-leader trigger bypasses only on `status='closed'`, not `'archived'`. Editing the wall is a rabbit-hole, so `delete_group`'s cascade rides the **established transaction-local `app.hard_delete_in_progress` flag** (the admin-hard-delete / PC002-erasure mechanism) — which also silences per-row `member_removed`/`role_removed` spam in favour of the single in-contract `group_deleted` notice.
2. **Supabase default privileges grant new functions to `anon` DIRECTLY** — `revoke from PUBLIC` alone is insufficient; every revoke must name `anon`. Caught by the PC014 gate-audit query; fixed red-first there. **The same inert posture (FIM-gated, 42501) sits on all twelve PC010–PC013 contracts** → the standing **pre-partition SECURITY DEFINER grant sweep** now has its mechanism: revoke `from anon` explicitly, not just PUBLIC. (Third confirmed data point after `leave_group` and the sprint3 hole.)
3. **Closure survivors (PC014 Open decision, nodded):** `close_group` counts *active* members only; paused/invited rows **survive on the closed tombstone** (only the caller departs). Pinned by test.
4. **grace1 in the bug report had no membership row by the time I looked** — a since-cleared row. Alice (currently `invited` in "Nya gruppen #2") is the live repro; the fix now returns "…already has a pending invitation…" there.

## Next session (build FEAT-H017 — the G-E Surface half)

**Start:** `build FEAT-H017` (or `build TASK-H017-01`). Loads `feature-development`. **No migration** — PC014 contracts are done and merged; this is pure Surface (ADR-U009/U038).

1. **TASK-H017-01** — `lib/groups` fetchers + **5 BFF routes** (`nominate-steward`, `hand-to-deusex`, `nomination-response`, `close`, `DELETE /api/groups/[id]`) + the **one scoped read** (own `stewardship_nomination` notifications — the A-NTF re-home seam). House map with the 409 message passed through verbatim; id-only telemetry. Red-first route-units. Confirm RPC signatures against migration `20260705072252`.
2. **TASK-H017-02** — the four flows: sole-Steward transfer choice (nominate pick-list from the existing member list / hand-to-DeusEx) on `/groups/[id]`; the nominee's pending-nomination affordance on `/groups`; Close (last member) + Delete (danger-styled, `delete_group`-gated, explicit confirm) on settings. All ConfirmModal, all relay-not-predict. **Four distinct intents: Leave / Remove / Close / Delete** — don't conflate.
3. **TASK-H017-03** — E2E (nomination-accept across FIMs; DeusEx fallback; hand-over; last-member close; Steward delete with a remaining member seeing the group vanish) on dedicated spec-created FIMs (suite isolation — shared-session token contention broke earlier runs). **`next build` is the type gate** (memory) → 6-done paperwork.
4. **The bundled Cycle G-E CHANGELOG entry** is written at H017 6-done (platform PC014 + Surface H017 together — the G-C/G-D bundled-entry precedent; PC014's half is merged and waiting for the bundle).
5. **Dev server for E2E / manual testing:** start a **session-owned `npm run dev`** — it dies with the Claude session (bridge `_09` finding 3).

## Standing / parked (unchanged unless noted)

- **The ADR-U040 referral-model rebuild** — new: retire `invite_by_email`, spec the referral link/code + its claim-at-transcendence resolution. Downstream decomposition (`ecosystem-decomposition`), not yet scoped; relates to CQ-014 (Mist/visitor experience), CQ-010 (first hour).
- **Pre-partition SECURITY DEFINER grant sweep** — now with a known mechanism (finding 2); three confirmed instances.
- **After G-E: the group-as-actor design session** at the G-E → G-F boundary (PC011 Open Q1 / G-29 — who may wield a group's agency), before G-F specs are authored.
- **Area-gate carry-forwards:** DS-3 freezes (`group_closed`/`group_archived`) at the Journeys gate; DS-4/DS-5 `pending-*` at Journeys/Communication; MEM-9 attribution at Communication; IDN-10 group-membership cascade rides G-D+G-E machinery.
- Standing from `_10`: G-36/IDN-10 + org-spec §5 seeding-sites doc-health finding by cooldown; IDN-12 + perf T2 parked; `test:integration:rbac` legacy-script cleanup at cooldown; the grant-toggle audit gap (`_09` finding 1); logo pick whenever Stefan chooses.
- **Launch checklist (unchanged):** custom SMTP before cohort onboarding; per-IP sign-in headroom for venue events; dev auth limits raised deliberately.

## Close-down note

Closed for a reboot. **`doc-health-check` was NOT run this session** — it's a candidate given the two schema migrations + the ADR (cross-cutting), but was deferred to keep the close clean; run it at the next cycle boundary or early next session. Dashboard not refreshed this session. No background processes left running (no dev server was started). All branches merged + deleted; `main` synced.
