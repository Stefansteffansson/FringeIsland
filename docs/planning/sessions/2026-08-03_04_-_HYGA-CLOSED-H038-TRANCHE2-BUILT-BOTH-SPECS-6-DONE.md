# Session bridge — cycle HYG-A CLOSED: the H038 post-apply tranche built and gated, both specs 6-done, ADM-E next

**Date:** 2026-08-03 (fourth session) · **Wave:** Ferd · **Cycle:** HYG-A (closed this session)
**Follows:** [`2026-08-03_03_-_HYGA-BUILT-PC023-HELD-AT-GATE-H038-TRANCHE1-BUILT.md`](./2026-08-03_03_-_HYGA-BUILT-PC023-HELD-AT-GATE-H038-TRANCHE1-BUILT.md) (whose addendum recorded the gate close + apply)

---

## READ THIS FIRST — the cycle is closed; the next session starts at ADM-E (per RB-1)

Cycle HYG-A is complete end-to-end: FEAT-PC023 (applied and verified last session) and FEAT-H038 (tranche 2 built this session) are both **6-done** with their §L4 rows updated in the same commit. The two walk scenarios are automated as E2E journeys and green. Per the RB board (session 2026-08-03_02), the next cycle is **ADM-E** from the [Platform-Ops completion plan](../hub-v2/phase-3-platform-ops-completion-plan.md).

## What was built (the H038 post-apply tranche — STORY-5/6/7)

**Red-first at the unit tier:** 19 new cases across six suites (three new, three extended), **14 demonstrated red at head**, 5 labelled in-suite as designed controls (the recheck never-fires boundary pins ×2, holder-no-banner, active-no-label, the full-payload no-overreach pin). Everything below went red → green in-session.

- **STORY-5 — two-mode rendering:** `GroupSummary.status` labels list rows ("Resting"/"Suspended"); the suspended **found-but-that's-it shell** is a payload-driven branch (`isGroupDetailShell()` keys on the absent `viewer` — an admin's full payload renders the normal surface); the resting **read-only banner** for non-`rest_group` holders; the canonical availability refusals (`P0001` + `'group is resting'`/`'group is suspended'`) reach member copy verbatim via one shared `availabilityRefusal()` (`hub/lib/groups/http.ts`) wired into the forum/announcements/messages mappers **and** the groups write routes that had no P0001 branch (settings PATCH, role create, invite send + both cancels, invitation accept/decline).
- **W-7 wiring completed:** every groups-client write transport fires `requestAccountStateRecheck()` on 401/403 (`throwFromWrite`); reads and 409s never do (pinned).
- **STORY-6 — the ceremonies:** steward **Rest/Wake** in the group panel's management row (pure `rest_group` capability gating, ConfirmModal, the "rest" verb); admin **mode choice** on the FEAT-H035 surface (active → Rest | Suspend; resting → Wake | Suspend; suspended → Reactivate) with two new admin BFF routes (`admin_rest_group`/`admin_wake_group`, audited substrate-side) and `resting` in both admin status vocabularies; **dated pointer added to FEAT-H035**. Placement resolution recorded in the spec: there is no standalone settings page — the management actions row is the settings surface.
- **STORY-7 — the journeys:** `group-availability.spec.ts` (rest → member read-only + holder exemption → wake → admin mode-choice suspend → shell with no leave/no content → reactivate; caretaker-leak delta 0) and `account-suspension-journey.spec.ts` (suspend mid-session → **wall in-session, no reload** via the refusal-triggered re-check → explicit exit to `/login` → sign-in-as-other lands clean). Both labelled test-after integrative coverage (house rule); behaviour red-first lives at the unit tier + the PC023 gate suite.

## Found at the E2E, fixed red-first in-session

The account journey's first run caught a real hole: a suspended member's profile save dies as **SQLSTATE 28000** — PC003's `update_own_profile` NOT FOUND branch fires because the `users_select_active` RLS policy (`is_active = true`) hides the caller's own row from `UPDATE … RETURNING`. The W-8 map didn't carry 28000, so the save collapsed to the generic 500 and the W-7 re-check never fired — exactly the dishonesty W-8 exists to fix. Fix: **28000 → 401** in the profile PATCH map (message through; red-first unit pin added to the W-8 suite), and the 401/403 re-check walls the session. Routed forward: PC003's `'Not authenticated.'` wording for this branch is stale for the suspended case — a sanction-communication candidate (Eid), not this cycle.

Two build-time gate catches worth remembering: a value export from `lib/groups/queries.ts` trips the **outer-ring conformance** gate (the `isGroupDetailShell` guard lives in `client.ts`; types stay type-only), and the shell union needs the `viewer?: undefined` discriminant or TS narrowing collapses to `never` (caught by `next build`, the type gate).

## Gates (cycle close)

- Full unit: **1195/1195** (154 suites) · lint **0 errors** · `next build` **green** · route-policy + outer-ring conformance green with zero new exceptions.
- Full integration sweep (`--runInBand` vs the dev DB): **70 suites / 979 tests, all green** (29.5 min — network-bound against the remote DB; the tranche-1 void data point is now properly discharged). Includes the PC023 availability gate suite live against the applied substrate.
- Full E2E sweep: **110/111 green (6.0 min), leak delta 0, both new journeys green** — the 1 red is `profile.spec` STORY-4, fenced **found (not caused)** by name: it is TASK-E2E-01's root-caused standing flake (ordering-dependent shared-session revocation), and the immediate isolated control ran **3/3 green**. Recurrence recorded in the task file — its watch condition is now met; the next boundary should schedule the 2 h fix. (Run 1 of the sweep failed 20 specs from the new account journey's own shared-session sign-out — the same trap class — fixed in-session with fixture isolation; see Decisions 1a.)
- Performance DoD: no first-paint request added or rerouted (revalidation is background; the status key rides existing payloads; Rest/Wake are interactions) — no deep-cold spot measurement owed; the spec's budget section stands as written in tranche 1.
- API-boundary DoD: the four new routes are pure BFF mappers over self-gating PC023 RPCs; the substrate's refusals are adversarially proven by the 117-cell availability gate suite (direct PostgREST path, applied last session).

## Plain-English walkthrough (walked against the shipped behaviour)

Gracy is a member of "Harbour Circle"; Stefan stewards it. Stefan opens his group and finds a new door in its management row: *Rest this group*. He clicks it; the platform tells him plainly what will happen — members keep reading, nothing changes until he wakes it — and he confirms. Gracy's groups list now says **Resting** beside the name; opening the group, she sees everything she could see before, plus one plain sentence: the group is resting and read-only until it wakes. If she tries to change something anyway, the answer is the reason — *"group is resting"* — not a shrug. Stefan sees no banner (he holds the key) and the door now reads *Wake this group*; one click and the group is whole again. Later, an administrator finds real trouble in the group. On the admin page the hold is now a choice — Rest or Suspend — and they choose Suspend, consequences named first. Gracy's list now says **Suspended**; opening the group shows its name, that one label, one sentence — no messages, no members, no forum, not even Leave. Stefan gets the same shell: there is no steward path out of the hard state. Meanwhile Gracy's own account is suspended by an admin while she's mid-session. She doesn't find out at some future reload: the next thing she tries to save answers honestly, and the suspension notice replaces the page right where she stands. The notice tells her the way out — *Sign out to use another account* — and the button actually takes her to sign-in, where her colleague's account signs in and lands in a perfectly normal app.

Continuity questions asked and answered: a resting group's member can still **leave** (the trap is sprung — deliberately open); a suspended group's member cannot (and can't see anything to leave from); the admin's own member-surface view of a suspended group renders the full payload (their plane's truth); nobody below the admin plane can rest their way into, or wake their way out of, `suspended`.

## Decisions / learnings this session

1. **The wall-trigger choice for the account E2E is the refusal path, deliberately** — the soft-nav/focus cadence sits behind the ≥30 s throttle; the refusal-triggered re-check is the same revalidator arriving faster, and it exercises W-8 on the way. Recorded in the spec notes.
1a. **A journey that ends in a sign-out must never run on the shared session storageState** (the TASK-E2E-01 trap class, sprung by this cycle's account journey at its first full-sweep run): the wall exit revoked the stored session server-side and 20 downstream specs failed on `getUser()` 401s while reads kept passing — the diagnostic signature to remember. Fixed with a dedicated subject FIM in a fresh context; rule stated in the spec header.
2. **The sandbox `find` is find.exe** (memory rule re-confirmed live — silent zero on existing files); `ls`/`grep` are the reliable probes.
3. **Dev server reuse:** port 3000 already served this checkout (left running); verified by process command line before running E2E against it.

## Doc-health at the boundary — findings and dispositions

**Fixed in-session:**
- **C-2 (this cycle's own miss):** FEAT-PC023 §Cross-product impact promised dated pointers on both domain §L4 summaries; neither had one. Both added — `docs/platform/domain/journeys.md` (the DS-3 doors + `get_my_enrollments.group_status`) and `communication.md` (the DS-5 doors + the never-held DM lane) — pointer-only, no guard restatement.
- **C-1 (pre-existing, A-ADM sweep debt):** the A-ADM task sweep (`d01e641`, 16 files) skipped its own link check and never logged itself. Fixed: the missing sweep-log line written (with the TASK-OBS-01 disposition — its bet paid via ADR-U052 + FEAT-PC018); the stale standing-table row retired; the dead links in `infrastructure-specification.md` and the platform-ops plan repointed to the sweep log. The notifications plan's mentions were prose, not links (the audit over-counted that one).
- **W-1/W-2 (vocabulary):** the canonical GRP-5 row (hub `SPECIFICATION.md` §L3) and its `tours/TECHNICAL.md` restatement now enumerate `active / resting / suspended / closed / archived`.
- **Skill precision (from the audit's notes):** the doc-health Section 5 grep now states the prefix-match is deliberate (a `$`-anchored variant phantom-flags 53/77 specs), and Section 1.5's drift table gained the "suspended as the only group hold" class (sense rule: account-`suspended` is a different axis, never drift).

**Routed forward — Stefan's calls / next passes:**
1. **W-3 — sibling-spec AC scoping:** ~30 write doors gained the availability guard, and sibling ACs (FEAT-PC010:74, FEAT-PD002:92, FEAT-H013:69 are representative) enumerate group status without `resting`. Blanket edits are the wrong fix (PC020's own "no suspension cascade" rabbit hole); the open decision is whether FEAT-PC023 is the guard's single documentation home (my recommendation — the two domain §L4 pointers added today already route readers there) or each sibling gets a dated pointer. One decision, then a ~30-minute mechanical pass at most.
2. **W-4 — `ARCHITECTURE_ANATOMY.md` stamp lags ADR-U052** (accepted, unassessed — touches Observability/PC-1). Belongs to the next anatomy pass (Audit IV / COR-D), not a hygiene edit here.
3. **Reader-tours refresh:** the audit flagged two "will eventually" lines, but the staleness is systemic — HUMAN.md still speaks future-tense about sessions (H012), journal, consent/export, reactivation (C-F), former-member attribution, announcements, the bell + preferences (N-C/N-D), and the whole admin plane (A-ADM). Spot-fixing two lines inside a coherent narrative would misrepresent the rest; the tours need one deliberate refresh pass against Phase-3 shipped reality (and TECHNICAL.md's ADM rows still read `Partial-Ferd`).
4. **ADR-U052's References line** still links the swept TASK-OBS-01 file — left deliberately (ADR edits are ask-first). If Stefan wants it repointed, it's a one-line change.

## Close ritual

- [x] `npm run dashboard` — refreshed at close (771 files indexed; rides this PR)
- [x] doc-health-check — run at the boundary (delegated agent; full report in the session scratchpad, summary + dispositions below): **2 critical / 4 warning / 6 info**, both criticals fixed in-session
- [x] Session bridge (this file)
- [x] Task sweep — TASK-HYGA-01 `done` (last session), TASK-HYGA-02 `done` (this session, criteria all ticked)
- [x] CHANGELOGs — root cycle entry + `hub/CHANGELOG.md` member-facing entry (platform-core register entry rode PR #390)
- [x] Discovery sweep — worktree clean and synced at session open; the close sweep (merge `main` → `discovery`, push) runs after this PR merges
- [x] PR / merge — one PR carries the whole tranche (five commits: build, cycle-close docs, doc-health fixes, the E2E fixture-isolation fix, close ritual); fuller-auto class (Hub code + routine docs — no schema, no core code, no ADR edits; the one ADR-adjacent item, U052's References line, was deliberately left untouched)
